import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sendPasswordResetSuccessEmail } from "@/lib/mailer";
import {
    buildPasswordHashFingerprint,
    validatePasswordResetToken,
} from "@/lib/password-reset";

type ConfirmForgotPasswordBody = {
    token?: string;
    newPassword?: string;
    confirmNewPassword?: string;
};

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, { status, headers });
}

export async function POST(request: NextRequest) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "auth-forgot-password-confirm",
            windowMs: 60_000,
            maxRequests: 10,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak percobaan reset password. Coba lagi nanti.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        await logApiRequest({
            request,
            endpoint: "/api/auth/forgot-password/confirm",
            userId: null,
        });

        const body = (await request.json()) as ConfirmForgotPasswordBody;
        const token = String(body.token ?? "").trim();
        const newPassword = String(body.newPassword ?? "");
        const confirmNewPassword = String(body.confirmNewPassword ?? "");

        if (!token || !newPassword || !confirmNewPassword) {
            return jsonResponse(
                {
                    success: false,
                    error: "Token, password baru, dan konfirmasi password wajib diisi.",
                },
                400
            );
        }

        if (newPassword.length < 8) {
            return jsonResponse(
                { success: false, error: "Password baru minimal 8 karakter." },
                400
            );
        }

        if (newPassword !== confirmNewPassword) {
            return jsonResponse(
                {
                    success: false,
                    error: "Konfirmasi password baru tidak cocok.",
                },
                400
            );
        }

        const tokenValidation = validatePasswordResetToken(token);
        if (!tokenValidation.valid) {
            return jsonResponse(
                {
                    success: false,
                    error: "Token reset password tidak valid atau sudah kedaluwarsa.",
                },
                400
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: tokenValidation.email },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                emailVerifiedAt: true,
            },
        });

        if (!user || !user.emailVerifiedAt || !user.password) {
            return jsonResponse(
                {
                    success: false,
                    error: "Token reset password tidak valid atau sudah kedaluwarsa.",
                },
                400
            );
        }

        const latestPasswordFingerprint = buildPasswordHashFingerprint(user.password);
        if (latestPasswordFingerprint !== tokenValidation.passwordFingerprint) {
            return jsonResponse(
                {
                    success: false,
                    error: "Token reset password tidak valid atau sudah kedaluwarsa.",
                },
                400
            );
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return jsonResponse(
                {
                    success: false,
                    error: "Password baru harus berbeda dari password lama.",
                },
                400
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
            },
        });

        sendPasswordResetSuccessEmail({
            to: user.email,
            name: user.name,
        }).catch((mailError) => {
            console.error("[FORGOT_PASSWORD_SEND_SUCCESS_EMAIL]", mailError);
        });

        return jsonResponse({
            success: true,
            message: "Password berhasil direset. Silakan login dengan password baru.",
        });
    } catch (error) {
        console.error("[FORGOT_PASSWORD_CONFIRM]", error);
        return jsonResponse(
            {
                success: false,
                error: "Terjadi kesalahan saat reset password.",
            },
            500
        );
    }
}
