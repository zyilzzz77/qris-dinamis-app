import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeQrisPayload, parseQRIS, validateQRIS } from "@/lib/qris";
import { decodeQrisFromImageBuffer } from "@/lib/qris-image";
import {
    checkRateLimit,
    rateLimitHeaders,
} from "@/lib/rate-limit";
import {
    deleteFile,
    sanitizeFilename,
    saveFile,
} from "@/lib/storage";
import { logApiRequest } from "@/lib/api-request-log";
import { optimizeQrisStaticImage } from "@/lib/image-optimizer";

const MAX_QRIS_UPLOAD_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/bmp",
    "image/tif",
    "image/tiff",
]);

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, {
        status,
        headers,
    });
}

function normalizeQrisString(raw: string): string {
    return normalizeQrisPayload(raw);
}

function isLikelyQris(rawQris: string): boolean {
    return rawQris.startsWith("000201") && rawQris.length > 30;
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/qris/upload",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const rateLimit = checkRateLimit(request, {
            keyPrefix: "dashboard-qris-upload",
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

        const formData = await request.formData();
        const rawInput = String(formData.get("rawQris") ?? "").trim();
        const file = formData.get("file");

        let rawQris = normalizeQrisString(rawInput);
        let uploadedImageUrl: string | null = null;

        if (!rawQris) {
            if (!(file instanceof File)) {
                return jsonResponse(
                    {
                        success: false,
                        error: "File gambar QRIS wajib diunggah atau isi string QRIS.",
                    },
                    400
                );
            }

            if (file.size > MAX_QRIS_UPLOAD_SIZE) {
                return jsonResponse(
                    {
                        success: false,
                        error: "Ukuran file maksimal 5MB.",
                    },
                    413
                );
            }

            if (file.type && !SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) {
                return jsonResponse(
                    {
                        success: false,
                        error: "Format gambar belum didukung. Gunakan PNG/JPG/GIF/BMP/TIFF.",
                    },
                    400
                );
            }

            const imageBuffer = Buffer.from(await file.arrayBuffer());
            const decodedQris = await decodeQrisFromImageBuffer(imageBuffer);

            if (!decodedQris) {
                return jsonResponse(
                    {
                        success: false,
                        error: "QRIS tidak terbaca dari gambar. Coba gambar lain yang lebih jelas.",
                    },
                    422
                );
            }

            rawQris = normalizeQrisString(decodedQris);

            const rawExt = (file.name.split(".").pop() || "png").toLowerCase();
            const ext = ["png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff"].includes(rawExt)
                ? rawExt
                : "png";
            const optimizedImage = await optimizeQrisStaticImage(imageBuffer, ext);
            const filename = sanitizeFilename(
                `${Date.now()}-qris-static.${optimizedImage.extension}`
            );

            uploadedImageUrl = await saveFile(
                `qris-static/${userId}`,
                filename,
                optimizedImage.buffer
            );
        }

        if (!isLikelyQris(rawQris)) {
            if (uploadedImageUrl) {
                await deleteFile(uploadedImageUrl);
            }

            return jsonResponse(
                {
                    success: false,
                    error: "String QRIS tidak valid. Pastikan data QRIS lengkap.",
                },
                400
            );
        }

        if (!validateQRIS(rawQris)) {
            if (uploadedImageUrl) {
                await deleteFile(uploadedImageUrl);
            }

            return jsonResponse(
                {
                    success: false,
                    error: "CRC QRIS tidak valid. Coba upload ulang QRIS yang benar.",
                },
                400
            );
        }

        const parsed = parseQRIS(rawQris);

        if (!parsed.merchantAccountInfos.length) {
            if (uploadedImageUrl) {
                await deleteFile(uploadedImageUrl);
            }

            return jsonResponse(
                {
                    success: false,
                    error: "Data merchant QRIS tidak ditemukan.",
                },
                400
            );
        }

        const merchantName = parsed.merchantName?.trim() || "MERCHANT";
        const merchantCity = parsed.merchantCity?.trim() || "INDONESIA";
        const nmid = parsed.nmid?.trim() || "N/A";

        const existingActive = await prisma.qrisStatic.findFirst({
            where: {
                userId,
                isActive: true,
            },
            select: {
                id: true,
                imageUrl: true,
            },
        });

        let qrisStatic;

        if (existingActive) {
            qrisStatic = await prisma.qrisStatic.update({
                where: { id: existingActive.id },
                data: {
                    rawString: rawQris,
                    merchantName,
                    merchantCity,
                    nmid,
                    imageUrl: uploadedImageUrl ?? existingActive.imageUrl ?? null,
                    isActive: true,
                },
            });

            if (
                uploadedImageUrl &&
                existingActive.imageUrl &&
                existingActive.imageUrl !== uploadedImageUrl
            ) {
                await deleteFile(existingActive.imageUrl);
            }
        } else {
            qrisStatic = await prisma.qrisStatic.create({
                data: {
                    userId,
                    rawString: rawQris,
                    merchantName,
                    merchantCity,
                    nmid,
                    imageUrl: uploadedImageUrl,
                    isActive: true,
                },
            });
        }

        return jsonResponse({
            success: true,
            message: "QRIS statis berhasil diproses.",
            data: qrisStatic,
        });
    } catch (error) {
        console.error("[DASHBOARD_QRIS_UPLOAD]", error);
        return jsonResponse(
            {
                success: false,
                error: "Terjadi kesalahan saat memproses QRIS.",
            },
            500
        );
    }
}
