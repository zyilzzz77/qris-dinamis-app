import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDynamicQRIS, parseQRIS } from "@/lib/qris";
import {
    checkRateLimit,
    rateLimitHeaders,
} from "@/lib/rate-limit";
import { saveFile, sanitizeFilename } from "@/lib/storage";
import { logApiRequest } from "@/lib/api-request-log";
import { calculateTax } from "@/lib/utils";
import type { TaxType } from "@/types";

type GenerateBody = {
    baseAmount?: number;
    taxType?: TaxType;
    customTaxRate?: number;
    description?: string;
};

const ALLOWED_TAX_TYPES = new Set<TaxType>(["NONE", "PPN", "PPH", "CUSTOM"]);

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, {
        status,
        headers,
    });
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/qris/generate",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const rateLimit = checkRateLimit(request, {
            keyPrefix: "dashboard-qris-generate",
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

        const body = (await request.json()) as GenerateBody;
        const baseAmount = Math.round(Number(body.baseAmount ?? 0));
        const taxType = body.taxType ?? "NONE";
        const customTaxRate = Number(body.customTaxRate ?? 0);
        const description = body.description?.trim() || null;

        if (!Number.isFinite(baseAmount) || baseAmount < 1000) {
            return jsonResponse(
                {
                    success: false,
                    error: "Nominal minimal Rp 1.000.",
                },
                400
            );
        }

        if (!ALLOWED_TAX_TYPES.has(taxType)) {
            return jsonResponse(
                {
                    success: false,
                    error: "Jenis pajak tidak valid.",
                },
                400
            );
        }

        if (taxType === "CUSTOM" && (!Number.isFinite(customTaxRate) || customTaxRate < 0 || customTaxRate > 100)) {
            return jsonResponse(
                {
                    success: false,
                    error: "Custom tax rate harus di antara 0 sampai 100.",
                },
                400
            );
        }

        const qrisStatic = await prisma.qrisStatic.findFirst({
            where: {
                userId,
                isActive: true,
            },
            select: {
                id: true,
                rawString: true,
            },
        });

        if (!qrisStatic) {
            return jsonResponse(
                {
                    success: false,
                    error: "QRIS statis belum ada. Upload QRIS statis dulu.",
                },
                404
            );
        }

        // Keep database state fresh: expired pending transactions become FAILED.
        await prisma.transaction.updateMany({
            where: {
                userId,
                status: {
                    in: ["PENDING", "WAITING_PROOF", "EXPIRED"],
                },
                expiresAt: {
                    lt: new Date(),
                },
            },
            data: {
                status: "FAILED",
            },
        });

        const { taxAmount, taxRate, totalAmount } = calculateTax(
            baseAmount,
            taxType,
            customTaxRate
        );

        const parsedQris = parseQRIS(qrisStatic.rawString);
        const dynamicQrisString = generateDynamicQRIS({
            parsedQris,
            amount: totalAmount,
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

        const filename = sanitizeFilename(`${Date.now()}-${qrisStatic.id}-qris-dynamic.png`);
        const qrisImageUrl = await saveFile(`qris/${userId}`, filename, qrImageBuffer as Buffer);

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const transaction = await prisma.transaction.create({
            data: {
                userId,
                qrisStaticId: qrisStatic.id,
                description,
                baseAmount,
                taxType,
                taxRate,
                taxAmount,
                totalAmount,
                qrisString: dynamicQrisString,
                qrisImageUrl,
                status: "PENDING",
                expiresAt,
            },
            select: {
                id: true,
            },
        });

        return jsonResponse({
            success: true,
            message: "QRIS dinamis berhasil dibuat.",
            data: {
                transactionId: transaction.id,
                qrisString: dynamicQrisString,
                qrisImageUrl,
                baseAmount,
                taxAmount,
                totalAmount,
                expiresAt: expiresAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("[DASHBOARD_QRIS_GENERATE]", error);
        return jsonResponse(
            {
                success: false,
                error: "Terjadi kesalahan saat generate QRIS.",
            },
            500
        );
    }
}
