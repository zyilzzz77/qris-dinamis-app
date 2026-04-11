import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
    EMAIL_VERIFICATION_MAX_ATTEMPTS,
    compareEmailVerificationCodeHash,
    isEmailVerificationCodeExpired,
    isValidEmailAddress,
    isValidEmailVerificationCode,
    normalizeEmailAddress,
} from "@/lib/email-verification";

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, { status, headers });
}

export async function POST(request: NextRequest) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "auth-verify-email-handler",
            windowMs: 60_000,
            maxRequests: 20,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak percobaan verifikasi. Coba lagi nanti.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        await logApiRequest({
            request,
            endpoint: "/api/auth/verify-email",
            userId: null,
        });

        const body = (await request.json()) as {
            email?: string;
            code?: string;
        };

        const normalizedEmail = normalizeEmailAddress(String(body.email ?? ""));
        const code = String(body.code ?? "").trim();

        if (!isValidEmailAddress(normalizedEmail) || !isValidEmailVerificationCode(code)) {
            return jsonResponse(
                { success: false, error: "Email atau kode verifikasi tidak valid." },
                400
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                email: true,
                emailVerifiedAt: true,
                emailVerificationCodeHash: true,
                emailVerificationCodeExpiresAt: true,
                emailVerificationAttempts: true,
            },
        });

        if (!user) {
            return jsonResponse(
                { success: false, error: "Email atau kode verifikasi tidak valid." },
                400
            );
        }

        if (user.emailVerifiedAt) {
            return jsonResponse({
                success: true,
                message: "Email sudah diverifikasi sebelumnya.",
            });
        }

        if (!user.emailVerificationCodeHash || !user.emailVerificationCodeExpiresAt) {
            return jsonResponse(
                {
                    success: false,
                    error: "Kode verifikasi tidak tersedia. Minta kirim ulang kode.",
                },
                400
            );
        }

        if (isEmailVerificationCodeExpired(user.emailVerificationCodeExpiresAt)) {
            return jsonResponse(
                {
                    success: false,
                    error: "Kode verifikasi sudah kedaluwarsa. Minta kirim ulang kode.",
                },
                410
            );
        }

        if (user.emailVerificationAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
            return jsonResponse(
                {
                    success: false,
                    error: "Percobaan verifikasi habis. Minta kirim ulang kode.",
                },
                429
            );
        }

        const isCodeValid = compareEmailVerificationCodeHash(
            user.email,
            code,
            user.emailVerificationCodeHash
        );

        if (!isCodeValid) {
            const nextAttempts = user.emailVerificationAttempts + 1;
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerificationAttempts: nextAttempts },
            });

            const remainingAttempts = Math.max(
                0,
                EMAIL_VERIFICATION_MAX_ATTEMPTS - nextAttempts
            );

            return jsonResponse(
                {
                    success: false,
                    error: `Kode verifikasi salah. Sisa percobaan: ${remainingAttempts}.`,
                },
                400
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationCodeHash: null,
                emailVerificationCodeExpiresAt: null,
                emailVerificationCodeSentAt: null,
                emailVerificationAttempts: 0,
            },
        });

        return jsonResponse({
            success: true,
            message: "Email berhasil diverifikasi. Kamu bisa login sekarang.",
        });
    } catch (error) {
        console.error("[VERIFY_EMAIL]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan saat verifikasi email." },
            500
        );
    }
}