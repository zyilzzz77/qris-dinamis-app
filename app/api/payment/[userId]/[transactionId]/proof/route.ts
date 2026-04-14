/**
 * app/api/payment/[userId]/[transactionId]/proof/route.ts
 * Public endpoint to upload transfer proof from external website.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile, sanitizeFilename } from "@/lib/storage";
import { toAbsoluteUrlFromRequest } from "@/lib/seo";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logApiRequest } from "@/lib/api-request-log";
import { optimizeProofImage } from "@/lib/image-optimizer";
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

const MAX_PROOF_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
    return Response.json(body, {
        status,
        headers: {
            ...CORS_HEADERS,
            ...extraHeaders,
        },
    });
}

function resolveImageExtension(file: File): string {
    const rawExt = (file.name.split(".").pop() || "").toLowerCase();

    if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"].includes(rawExt)) {
        return rawExt;
    }

    if (file.type === "image/png") return "png";
    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/webp") return "webp";
    if (file.type === "image/gif") return "gif";
    if (file.type === "image/bmp") return "bmp";
    if (file.type === "image/tiff") return "tiff";

    return "jpg";
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
            keyPrefix: "public-payment-proof",
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
            endpoint: "/api/payment/[userId]/[transactionId]/proof",
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
                expiresAt: true,
            },
        });

        if (!transaction) {
            return jsonResponse(
                { success: false, error: "Transaksi tidak ditemukan" },
                404
            );
        }

        if (transaction.status === "PAID") {
            return jsonResponse(
                { success: false, error: "Transaksi sudah lunas" },
                400
            );
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

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return jsonResponse(
                {
                    success: false,
                    error: "File bukti transfer wajib diunggah (field: file)",
                },
                400
            );
        }

        if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
            return jsonResponse(
                {
                    success: false,
                    error: "Ukuran file maksimal 5MB",
                },
                413
            );
        }

        if (file.type && !file.type.startsWith("image/")) {
            return jsonResponse(
                { success: false, error: "Format file harus berupa gambar" },
                400
            );
        }

        const ext = resolveImageExtension(file);
        const sourceBuffer = Buffer.from(await file.arrayBuffer());
        const optimizedImage = await optimizeProofImage(sourceBuffer, ext);
        const filename = sanitizeFilename(
            `${Date.now()}-${transactionId}-proof.${optimizedImage.extension}`
        );
        const proofImageUrl = await saveFile(
            `proofs/${userId}`,
            filename,
            optimizedImage.buffer
        );

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                proofImageUrl,
                status: "WAITING_PROOF",
            },
            select: {
                id: true,
                status: true,
                proofImageUrl: true,
                updatedAt: true,
            },
        });

        return jsonResponse({
            success: true,
            message: "Bukti transfer berhasil diunggah",
            data: {
                transactionId: updated.id,
                status: updated.status,
                proofImageUrl: updated.proofImageUrl,
                proofImageFullUrl: toAbsoluteUrlFromRequest(proofImageUrl, request),
                updatedAt: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("[PUBLIC_PAYMENT_PROOF_UPLOAD]", error);
        return jsonResponse(
            { success: false, error: "Gagal upload bukti transfer" },
            500
        );
    }
}
