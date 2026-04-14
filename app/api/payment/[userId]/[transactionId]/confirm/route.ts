/**
 * app/api/payment/[userId]/[transactionId]/confirm/route.ts
 * Public endpoint to mark payment as PAID.
 * Rule: transaction cannot be PAID if transfer proof has not been uploaded.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logApiRequest } from "@/lib/api-request-log";
import { markTransactionFailedAndCleanupQrisImage } from "@/lib/transaction-expiry";

type RouteParams = {
    userId: string;
    transactionId: string;
};

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function POST(
    request: NextRequest,
    context: { params: Promise<RouteParams> }
) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "public-payment-confirm",
            windowMs: 60_000,
            maxRequests: 20,
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
            endpoint: "/api/payment/[userId]/[transactionId]/confirm",
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
                status: true,
                qrisImageUrl: true,
                proofImageUrl: true,
                expiresAt: true,
                confirmedAt: true,
            },
        });

        if (!transaction) {
            return jsonResponse(
                { success: false, error: "Transaksi tidak ditemukan" },
                404
            );
        }

        if (transaction.status === "PAID") {
            return jsonResponse({
                success: true,
                message: "Transaksi sudah berstatus PAID",
                data: {
                    transactionId: transaction.id,
                    status: transaction.status,
                    confirmedAt: transaction.confirmedAt?.toISOString() ?? null,
                },
            });
        }

        if (transaction.status === "FAILED") {
            if (transaction.qrisImageUrl) {
                await markTransactionFailedAndCleanupQrisImage({
                    transactionId: transaction.id,
                    qrisImageUrl: transaction.qrisImageUrl,
                });
            }

            return jsonResponse(
                { success: false, error: "Transaksi sudah gagal" },
                410
            );
        }

        if (transaction.status === "EXPIRED") {
            await markTransactionFailedAndCleanupQrisImage({
                transactionId: transaction.id,
                qrisImageUrl: transaction.qrisImageUrl,
            });

            return jsonResponse(
                { success: false, error: "Transaksi sudah gagal" },
                410
            );
        }

        if (transaction.expiresAt && transaction.expiresAt.getTime() < Date.now()) {
            await markTransactionFailedAndCleanupQrisImage({
                transactionId: transaction.id,
                qrisImageUrl: transaction.qrisImageUrl,
            });

            return jsonResponse(
                { success: false, error: "Transaksi gagal karena melebihi 10 menit" },
                410
            );
        }

        if (!transaction.proofImageUrl) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "Bukti transfer belum dikirim. Status tidak bisa diubah ke PAID.",
                },
                400
            );
        }

        let confirmedBy = "PUBLIC_API";
        try {
            const body = (await request.json()) as { confirmedBy?: string };
            if (body?.confirmedBy?.trim()) {
                confirmedBy = body.confirmedBy.trim().slice(0, 64);
            }
        } catch {
            // Optional JSON body; ignore parse errors.
        }

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: "PAID",
                confirmedAt: new Date(),
                confirmedBy,
            },
            select: {
                id: true,
                status: true,
                confirmedAt: true,
                confirmedBy: true,
            },
        });

        return jsonResponse({
            success: true,
            message: "Transaksi berhasil ditandai sebagai PAID",
            data: {
                transactionId: updated.id,
                status: updated.status,
                confirmedAt: updated.confirmedAt?.toISOString() ?? null,
                confirmedBy: updated.confirmedBy,
            },
        });
    } catch (error) {
        console.error("[PUBLIC_PAYMENT_CONFIRM]", error);
        return jsonResponse(
            { success: false, error: "Gagal konfirmasi pembayaran" },
            500
        );
    }
}
