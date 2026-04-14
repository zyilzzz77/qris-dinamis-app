import { NextRequest } from "next/server";
import QRCode from "qrcode";

import { parseQRIS, generateDynamicQRIS } from "@/lib/qris";
import { saveFile, sanitizeFilename } from "@/lib/storage";
import { toAbsoluteUrlFromRequest } from "@/lib/seo";
import { optimizeQrisDynamicImage } from "@/lib/image-optimizer";
import { cleanupExpiredTransactionsForUser } from "@/lib/transaction-expiry";

export function parseNominal(rawNominal: string): number {
    const digitsOnly = rawNominal.replace(/\D/g, "");
    return Number.parseInt(digitsOnly, 10) || 0;
}

export function buildPaymentEndpoints(params: {
    request: NextRequest;
    userId: string;
    transactionId: string;
}) {
    const safeUser = encodeURIComponent(params.userId);
    const safeTxId = encodeURIComponent(params.transactionId);

    return {
        proofUploadUrl: toAbsoluteUrlFromRequest(
            `/api/payment/${safeUser}/${safeTxId}/proof`,
            params.request
        ),
        statusCheckUrl: toAbsoluteUrlFromRequest(
            `/api/payment/${safeUser}/${safeTxId}/status`,
            params.request
        ),
        confirmPaymentUrl: toAbsoluteUrlFromRequest(
            `/api/payment/${safeUser}/${safeTxId}/confirm`,
            params.request
        ),
    };
}

export async function createDynamicQrisImage(params: {
    userId: string;
    qrisId: string;
    rawQrisStatic: string;
    amount: number;
    request: NextRequest;
}) {
    const parsedQris = parseQRIS(params.rawQrisStatic);
    const dynamicQrisString = generateDynamicQRIS({
        parsedQris,
        amount: params.amount,
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
        `${Date.now()}-${params.qrisId}-qris-dynamic.${optimizedQrisImage.extension}`
    );
    const qrisImageUrl = await saveFile(
        `qris/${params.userId}`,
        filename,
        optimizedQrisImage.buffer
    );

    return {
        dynamicQrisString,
        qrisImageUrl,
        qrisImageFullUrl: toAbsoluteUrlFromRequest(qrisImageUrl, params.request),
    };
}

export async function markExpiredTransactionsAsFailed(userId: string): Promise<void> {
    await cleanupExpiredTransactionsForUser(userId);
}