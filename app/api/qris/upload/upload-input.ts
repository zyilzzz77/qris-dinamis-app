import { normalizeQrisPayload, parseQRIS, validateQRIS } from "@/lib/qris";
import { decodeQrisFromImageBuffer } from "@/lib/qris-image";
import { deleteFile, sanitizeFilename, saveFile } from "@/lib/storage";
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

export type UploadQrisInputResult =
    | {
        ok: true;
        rawQris: string;
        uploadedImageUrl: string | null;
    }
    | {
        ok: false;
        response: Response;
    };

export type ParsedQrisResult =
    | {
        ok: true;
        merchantName: string;
        merchantCity: string;
        nmid: string;
    }
    | {
        ok: false;
        response: Response;
    };

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

async function cleanupUploadedImage(imageUrl: string | null): Promise<void> {
    if (!imageUrl) {
        return;
    }

    await deleteFile(imageUrl);
}

async function saveOptimizedQrisStaticImage(
    file: File,
    userId: string,
    imageBuffer: Buffer
): Promise<string> {
    const rawExt = (file.name.split(".").pop() || "png").toLowerCase();
    const ext = ["png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff"].includes(rawExt)
        ? rawExt
        : "png";
    const optimizedImage = await optimizeQrisStaticImage(imageBuffer, ext);
    const filename = sanitizeFilename(
        `${Date.now()}-qris-static.${optimizedImage.extension}`
    );

    return saveFile(
        `qris-static/${userId}`,
        filename,
        optimizedImage.buffer
    );
}

export async function extractQrisInput(
    formData: FormData,
    userId: string
): Promise<UploadQrisInputResult> {
    const rawInput = String(formData.get("rawQris") ?? "").trim();
    const file = formData.get("file");

    const normalizedRawInput = normalizeQrisString(rawInput);
    if (normalizedRawInput) {
        return {
            ok: true,
            rawQris: normalizedRawInput,
            uploadedImageUrl: null,
        };
    }

    if (!(file instanceof File)) {
        return {
            ok: false,
            response: jsonResponse(
                {
                    success: false,
                    error: "File gambar QRIS wajib diunggah atau isi string QRIS.",
                },
                400
            ),
        };
    }

    if (file.size > MAX_QRIS_UPLOAD_SIZE) {
        return {
            ok: false,
            response: jsonResponse(
                {
                    success: false,
                    error: "Ukuran file maksimal 5MB.",
                },
                413
            ),
        };
    }

    if (file.type && !SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) {
        return {
            ok: false,
            response: jsonResponse(
                {
                    success: false,
                    error: "Format gambar belum didukung. Gunakan PNG/JPG/GIF/BMP/TIFF.",
                },
                400
            ),
        };
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const decodedQris = await decodeQrisFromImageBuffer(imageBuffer);

    if (!decodedQris) {
        return {
            ok: false,
            response: jsonResponse(
                {
                    success: false,
                    error: "QRIS tidak terbaca dari gambar. Coba gambar lain yang lebih jelas.",
                },
                422
            ),
        };
    }

    const uploadedImageUrl = await saveOptimizedQrisStaticImage(file, userId, imageBuffer);

    return {
        ok: true,
        rawQris: normalizeQrisString(decodedQris),
        uploadedImageUrl,
    };
}

export async function validateAndParseQris(
    rawQris: string,
    uploadedImageUrl: string | null
): Promise<ParsedQrisResult> {
    if (!isLikelyQris(rawQris)) {
        await cleanupUploadedImage(uploadedImageUrl);

        return {
            ok: false,
            response: jsonResponse(
                {
                    success: false,
                    error: "String QRIS tidak valid. Pastikan data QRIS lengkap.",
                },
                400
            ),
        };
    }

    if (!validateQRIS(rawQris)) {
        await cleanupUploadedImage(uploadedImageUrl);

        return {
            ok: false,
            response: jsonResponse(
                {
                    success: false,
                    error: "CRC QRIS tidak valid. Coba upload ulang QRIS yang benar.",
                },
                400
            ),
        };
    }

    const parsed = parseQRIS(rawQris);

    if (!parsed.merchantAccountInfos.length) {
        await cleanupUploadedImage(uploadedImageUrl);

        return {
            ok: false,
            response: jsonResponse(
                {
                    success: false,
                    error: "Data merchant QRIS tidak ditemukan.",
                },
                400
            ),
        };
    }

    return {
        ok: true,
        merchantName: parsed.merchantName?.trim() || "MERCHANT",
        merchantCity: parsed.merchantCity?.trim() || "INDONESIA",
        nmid: parsed.nmid?.trim() || "N/A",
    };
}