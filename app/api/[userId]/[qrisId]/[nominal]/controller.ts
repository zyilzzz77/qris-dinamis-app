import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { toAbsoluteUrlFromRequest } from "@/lib/seo";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logApiRequest } from "@/lib/api-request-log";
import {
    buildPaymentEndpoints,
    createDynamicQrisImage,
    markExpiredTransactionsAsFailed,
    parseNominal,
} from "./public-qris-service";

export type RouteParams = {
    userId: string;
    qrisId: string;
    nominal: string;
};

export const CORS_HEADERS = {
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

export async function handlePublicQrisGenerateRequest(
    request: NextRequest,
    paramsPromise: Promise<RouteParams>
): Promise<Response> {
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

        const { userId, qrisId, nominal } = await paramsPromise;

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

        await markExpiredTransactionsAsFailed(userId);

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

        const { dynamicQrisString, qrisImageUrl, qrisImageFullUrl } =
            await createDynamicQrisImage({
                userId,
                qrisId,
                rawQrisStatic: qrisStatic.rawString,
                amount: baseAmount,
                request,
            });

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
        const paymentEndpoints = buildPaymentEndpoints({
            request,
            userId,
            transactionId: transaction.id,
        });

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
                paymentEndpoints,
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