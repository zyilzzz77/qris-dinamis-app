/**
 * app/api/[userId]/[qrisId]/[nominal]/route.ts
 * Public GET endpoint for external websites to request dynamic QRIS.
 *
 * Example:
 * GET /api/<userId>/<qrisId>/<nominal>
 */

import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { parseQRIS, generateDynamicQRIS } from "@/lib/qris";
import { saveFile, sanitizeFilename } from "@/lib/storage";
import { toAbsoluteUrlFromRequest } from "@/lib/seo";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logApiRequest } from "@/lib/api-request-log";
import { optimizeQrisDynamicImage } from "@/lib/image-optimizer";

type RouteParams = {
    userId: string;
    qrisId: string;
    nominal: string;
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

function parseNominal(rawNominal: string): number {
    const digitsOnly = rawNominal.replace(/\D/g, "");
    return Number.parseInt(digitsOnly, 10) || 0;
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<RouteParams> }
) {
    try {
        const rateLimit = checkRateLimit(request, {
            keyPrefix: "public-generate",
            windowMs: 60_000,
            maxRequests: 30,
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

        const { userId, qrisId, nominal } = await context.params;

        await logApiRequest({
            request,
            endpoint: "/api/[userId]/[qrisId]/[nominal]",
            userId: userId || null,
        });

        if (!userId || !qrisId || !nominal) {
            return jsonResponse(
                { success: false, error: "Parameter URL tidak lengkap" },
                400
            );
        }

        const baseAmount = parseNominal(nominal);
        if (!Number.isFinite(baseAmount) || baseAmount < 1000) {
            return jsonResponse(
                { success: false, error: "Nominal minimal Rp 1.000" },
                400
            );
        }

        // Keep database state fresh: expired pending transactions become FAILED.
        await prisma.transaction.updateMany({
            where: {
                userId,
                status: { in: ["PENDING", "WAITING_PROOF", "EXPIRED"] },
                expiresAt: { lt: new Date() },
            },
            data: { status: "FAILED" },
        });

        const qrisStatic = await prisma.qrisStatic.findFirst({
            where: {
                id: qrisId,
                userId,
                isActive: true,
            },
            select: {
                id: true,
                rawString: true,
                merchantName: true,
                merchantCity: true,
            },
        });

        if (!qrisStatic) {
            return jsonResponse(
                {
                    success: false,
                    error: "QRIS statis tidak ditemukan untuk user ini",
                },
                404
            );
        }

        const parsedQris = parseQRIS(qrisStatic.rawString);
        const dynamicQrisString = generateDynamicQRIS({
            parsedQris,
            amount: baseAmount,
        });

        const qrImageBuffer = await QRCode.toBuffer(dynamicQrisString, {
            type: "png",
            width: 512,
            margin: 2,
            color: {
                dark: "#0D0D0D",
                light: "#FFFBF0",
            },
            errorCorrectionLevel: "M",
        });
        const optimizedQrisImage = await optimizeQrisDynamicImage(qrImageBuffer, "png");

        const filename = sanitizeFilename(
            `${Date.now()}-${qrisId}-qris-dynamic.${optimizedQrisImage.extension}`
        );
        const qrisImageUrl = await saveFile(
            `qris/${userId}`,
            filename,
            optimizedQrisImage.buffer
        );
        const qrisImageFullUrl = toAbsoluteUrlFromRequest(qrisImageUrl, request);

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const transaction = await prisma.transaction.create({
            data: {
                userId,
                qrisStaticId: qrisStatic.id,
                description: `API request ${request.nextUrl.pathname}`,
                baseAmount,
                taxType: "NONE",
                taxRate: 0,
                taxAmount: 0,
                totalAmount: baseAmount,
                qrisString: dynamicQrisString,
                qrisImageUrl,
                status: "PENDING",
                expiresAt,
            },
        });

        const imageShortPath = `/${encodeURIComponent(userId)}/${encodeURIComponent(transaction.id)}`;
        const imageShortUrl = toAbsoluteUrlFromRequest(imageShortPath, request);
        const docsUrl = toAbsoluteUrlFromRequest("/rest-api", request);
        const safeUser = encodeURIComponent(userId);
        const safeTxId = encodeURIComponent(transaction.id);
        const proofUploadUrl = toAbsoluteUrlFromRequest(
            `/api/payment/${safeUser}/${safeTxId}/proof`,
            request
        );
        const statusCheckUrl = toAbsoluteUrlFromRequest(
            `/api/payment/${safeUser}/${safeTxId}/status`,
            request
        );
        const confirmPaymentUrl = toAbsoluteUrlFromRequest(
            `/api/payment/${safeUser}/${safeTxId}/confirm`,
            request
        );

        return jsonResponse({
            success: true,
            data: {
                transactionId: transaction.id,
                qrisId: qrisStatic.id,
                merchantName: qrisStatic.merchantName,
                merchantCity: qrisStatic.merchantCity,
                qrisString: dynamicQrisString,
                qrisImageUrl,
                qrisImageFullUrl,
                imageLink: imageShortUrl,
                imageShortUrl,
                baseAmount,
                taxAmount: 0,
                totalAmount: baseAmount,
                expiresAt: expiresAt.toISOString(),
                expiresInMinutes: 10,
                docsUrl,
                paymentEndpoints: {
                    proofUploadUrl,
                    statusCheckUrl,
                    confirmPaymentUrl,
                },
            },
        });
    } catch (error) {
        console.error("[PUBLIC_QRIS_GENERATE]", error);
        return jsonResponse(
            { success: false, error: "Gagal generate QRIS dinamis via API" },
            500
        );
    }
}
