import { NextRequest } from "next/server";
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
    return Response.json(body, { status, headers });
}

export async function POST(request: NextRequest) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "auth-resend-verification-handler",
            windowMs: 60_000,
            maxRequests: 6,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak permintaan kirim ulang. Coba lagi nanti.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        await logApiRequest({
            request,
            endpoint: "/api/auth/resend-verification",
            userId: null,
        });

        const body = (await request.json()) as { email?: string };
        const normalizedEmail = normalizeEmailAddress(String(body.email ?? ""));

        if (!isValidEmailAddress(normalizedEmail)) {
            return jsonResponse(
                { success: false, error: "Format email tidak valid." },
                400
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                email: true,
                name: true,
                emailVerifiedAt: true,
                emailVerificationCodeSentAt: true,
            },
        });

        if (!user) {
            return jsonResponse({
                success: true,
                message:
                    "Jika email terdaftar dan belum diverifikasi, kode verifikasi akan dikirim.",
            });
        }

        if (user.emailVerifiedAt) {
            return jsonResponse(
                { success: false, error: "Email sudah diverifikasi." },
                400
            );
        }

        const cooldownSeconds = getResendCooldownSeconds(user.emailVerificationCodeSentAt);

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

        const verificationData = buildEmailVerificationData(user.email);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationCodeHash: verificationData.codeHash,
                emailVerificationCodeExpiresAt: verificationData.expiresAt,
                emailVerificationCodeSentAt: verificationData.sentAt,
                emailVerificationAttempts: 0,
            },
        });

        await sendVerificationCodeEmail({
            to: user.email,
            name: user.name,
            code: verificationData.code,
            expiresInMinutes: EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES,
        });

        return jsonResponse({
            success: true,
            message: "Kode verifikasi baru sudah dikirim ke email kamu.",
        });
    } catch (error) {
        console.error("[RESEND_VERIFICATION]", error);
        return jsonResponse(
            {
                success: false,
                error: "Terjadi kesalahan saat kirim ulang kode verifikasi.",
            },
            500
        );
    }
}