/**
 * app/api/auth/register/route.ts
 * POST — Register a new user
 */

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
    EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES,
    buildEmailVerificationData,
    getResendCooldownSeconds,
    isValidEmailAddress,
    normalizeEmailAddress,
} from "@/lib/email-verification";
import { sendVerificationCodeEmail } from "@/lib/mailer";

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, {
        status,
        headers,
    });
}

export async function POST(request: NextRequest) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "auth-register-handler",
            windowMs: 60_000,
            maxRequests: 5,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak percobaan registrasi. Coba lagi nanti.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        await logApiRequest({
            request,
            endpoint: "/api/auth/register",
            userId: null,
        });

        const body = await request.json();
        const { name, email, password } = body;
        const normalizedEmail = normalizeEmailAddress(String(email ?? ""));
        const normalizedName = String(name ?? "").trim();

        if (!normalizedName || !normalizedEmail || !password) {
            return jsonResponse(
                { success: false, error: "Semua field wajib diisi" },
                400
            );
        }

        if (!isValidEmailAddress(normalizedEmail)) {
            return jsonResponse(
                { success: false, error: "Format email tidak valid" },
                400
            );
        }

        if (password.length < 8) {
            return jsonResponse(
                { success: false, error: "Password minimal 8 karakter" },
                400
            );
        }

        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                emailVerifiedAt: true,
                emailVerificationCodeSentAt: true,
            },
        });

        if (existing?.emailVerifiedAt) {
            return jsonResponse(
                { success: false, error: "Email sudah terdaftar" },
                409
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationData = buildEmailVerificationData(normalizedEmail);

        let user: {
            id: string;
            name: string | null;
            email: string;
            createdAt: Date;
        };

        if (existing) {
            const cooldownSeconds = getResendCooldownSeconds(
                existing.emailVerificationCodeSentAt
            );

            if (cooldownSeconds > 0) {
                return jsonResponse(
                    {
                        success: false,
                        error: `Kode baru bisa dikirim ulang dalam ${cooldownSeconds} detik.`,
                    },
                    429,
                    { "Retry-After": String(cooldownSeconds) }
                );
            }

            user = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    name: normalizedName,
                    password: hashedPassword,
                    emailVerificationCodeHash: verificationData.codeHash,
                    emailVerificationCodeExpiresAt: verificationData.expiresAt,
                    emailVerificationCodeSentAt: verificationData.sentAt,
                    emailVerificationAttempts: 0,
                },
                select: { id: true, name: true, email: true, createdAt: true },
            });
        } else {
            user = await prisma.user.create({
                data: {
                    name: normalizedName,
                    email: normalizedEmail,
                    password: hashedPassword,
                    emailVerifiedAt: null,
                    emailVerificationCodeHash: verificationData.codeHash,
                    emailVerificationCodeExpiresAt: verificationData.expiresAt,
                    emailVerificationCodeSentAt: verificationData.sentAt,
                    emailVerificationAttempts: 0,
                },
                select: { id: true, name: true, email: true, createdAt: true },
            });
        }

        try {
            await sendVerificationCodeEmail({
                to: user.email,
                name: user.name,
                code: verificationData.code,
                expiresInMinutes: EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES,
            });
        } catch (mailError) {
            console.error("[REGISTER_SEND_VERIFICATION_EMAIL]", mailError);
            return jsonResponse(
                {
                    success: false,
                    error:
                        "Akun berhasil disiapkan, tapi email verifikasi gagal dikirim. Coba kirim ulang kode verifikasi.",
                    data: {
                        email: user.email,
                        requiresEmailVerification: true,
                    },
                },
                500
            );
        }

        return jsonResponse(
            {
                success: true,
                data: {
                    ...user,
                    requiresEmailVerification: true,
                    emailVerificationExpiresInMinutes:
                        EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES,
                },
                message: existing
                    ? "Akun belum diverifikasi. Kode verifikasi baru sudah dikirim."
                    : "Registrasi berhasil. Cek email untuk kode verifikasi.",
            },
            existing ? 200 : 201
        );
    } catch (error) {
        console.error("[REGISTER]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan server" },
            500
        );
    }
}
