/**
 * app/api/payment/[userId]/[transactionId]/status/route.ts
 * Public endpoint to check payment status with automatic status update.
 */

import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logApiRequest } from "@/lib/api-request-log";

type RouteParams = {
    userId: string;
    transactionId: string;
};

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
    return Response.json(body, {
        status,
        headers: {
            ...CORS_HEADERS,
            ...extraHeaders,
        },
    });
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
    request: Request,
    context: { params: Promise<RouteParams> }
) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "public-payment-status",
            windowMs: 60_000,
            maxRequests: 60,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak request. Coba lagi beberapa saat.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        const { userId, transactionId } = await context.params;

        await logApiRequest({
            request,
            endpoint: "/api/payment/[userId]/[transactionId]/status",
            userId: userId || null,
        });

        if (!userId || !transactionId) {
            return jsonResponse(
                { success: false, error: "Parameter URL tidak lengkap" },
                400
            );
        }

        const transaction = await prisma.transaction.findFirst({
            where: { id: transactionId, userId },
            select: {
                id: true,
                userId: true,
                status: true,
                proofImageUrl: true,
                expiresAt: true,
                baseAmount: true,
                taxAmount: true,
                totalAmount: true,
                updatedAt: true,
            },
        });

        if (!transaction) {
            return jsonResponse(
                { success: false, error: "Transaksi tidak ditemukan" },
                404
            );
        }

        let normalizedStatus = transaction.status === "EXPIRED" ? "FAILED" : transaction.status;

        // Auto check expiry
        if (
            normalizedStatus !== "PAID" &&
            transaction.expiresAt &&
            transaction.expiresAt.getTime() < Date.now()
        ) {
            normalizedStatus = "FAILED";
        }

        // Auto check proof state
        if (normalizedStatus !== "FAILED" && normalizedStatus !== "PAID") {
            if (transaction.proofImageUrl && normalizedStatus === "PENDING") {
                normalizedStatus = "WAITING_PROOF";
            }

            if (!transaction.proofImageUrl && normalizedStatus === "WAITING_PROOF") {
                normalizedStatus = "PENDING";
            }
        }

        if (normalizedStatus !== transaction.status) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: normalizedStatus },
            });
        }

        const now = new Date().toISOString();
        const canBeMarkedPaid =
            !!transaction.proofImageUrl &&
            normalizedStatus !== "FAILED" &&
            normalizedStatus !== "PAID";

        return jsonResponse({
            success: true,
            data: {
                transactionId: transaction.id,
                userId: transaction.userId,
                status: normalizedStatus,
                proofUploaded: Boolean(transaction.proofImageUrl),
                proofImageUrl: transaction.proofImageUrl,
                canBeMarkedPaid,
                baseAmount: transaction.baseAmount,
                taxAmount: transaction.taxAmount,
                totalAmount: transaction.totalAmount,
                expiresAt: transaction.expiresAt?.toISOString() ?? null,
                checkedAt: now,
                updatedAt: transaction.updatedAt.toISOString(),
                statusRule:
                    "Tanpa bukti transfer, transaksi tidak bisa berhasil (PAID). Jika lewat 10 menit, status menjadi FAILED (gagal).",
            },
        });
    } catch (error) {
        console.error("[PUBLIC_PAYMENT_STATUS_CHECK]", error);
        return jsonResponse(
            { success: false, error: "Gagal memeriksa status pembayaran" },
            500
        );
    }
}
