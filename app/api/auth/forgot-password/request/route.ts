import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-verification";
import { sendPasswordResetInstructionEmail } from "@/lib/mailer";
import {
    createPasswordResetToken,
    PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
} from "@/lib/password-reset";
import { getRequestOrigin } from "@/lib/seo";

const RESET_LINK_SENT_MESSAGE =
    "Instruksi reset password sudah dikirim ke email tersebut.";

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, { status, headers });
}

export async function POST(request: NextRequest) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "auth-forgot-password-request",
            windowMs: 60_000,
            maxRequests: 6,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak permintaan reset password. Coba lagi nanti.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        await logApiRequest({
            request,
            endpoint: "/api/auth/forgot-password/request",
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
                password: true,
                emailVerifiedAt: true,
            },
        });

        if (!user) {
            return jsonResponse(
                {
                    success: false,
                    error: "Email tidak ditemukan di database.",
                },
                404
            );
        }

        if (!user.emailVerifiedAt) {
            return jsonResponse(
                {
                    success: false,
                    error: "Email belum diverifikasi. Selesaikan verifikasi akun terlebih dahulu.",
                },
                400
            );
        }

        if (!user.password) {
            return jsonResponse(
                {
                    success: false,
                    error: "Akun ini tidak memiliki password yang bisa direset.",
                },
                400
            );
        }

        const token = createPasswordResetToken({
            email: user.email,
            passwordHash: user.password,
            expiresInMinutes: PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
        });

        const baseOriginForResetUrl =
            process.env.NODE_ENV === "production"
                ? getRequestOrigin(request)
                : request.nextUrl.origin || getRequestOrigin(request);

        const resetUrl = new URL("/reset-password", baseOriginForResetUrl);
        resetUrl.searchParams.set("token", token);
        resetUrl.searchParams.set("email", user.email);

        try {
            await sendPasswordResetInstructionEmail({
                to: user.email,
                name: user.name,
                resetUrl: resetUrl.toString(),
                expiresInMinutes: PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
            });
        } catch (mailError) {
            console.error("[FORGOT_PASSWORD_SEND_EMAIL]", mailError);
            return jsonResponse(
                {
                    success: false,
                    error: "Gagal mengirim email reset password. Coba lagi beberapa saat.",
                },
                500
            );
        }

        return jsonResponse({
            success: true,
            message: RESET_LINK_SENT_MESSAGE,
        });
    } catch (error) {
        console.error("[FORGOT_PASSWORD_REQUEST]", error);
        return jsonResponse(
            {
                success: false,
                error: "Terjadi kesalahan saat memproses lupa password.",
            },
            500
        );
    }
}
