import sharp from "sharp";

type OptimizedImage = {
    buffer: Buffer;
    extension: string;
};

const SHARP_LIMIT_INPUT_PIXELS = 40_000_000;

function normalizeExtension(extension: string): string {
    const raw = extension.trim().toLowerCase();

    if (raw === "jpeg") return "jpg";
    if (raw === "tif") return "tiff";
    if (["png", "jpg", "webp", "gif", "bmp", "tiff"].includes(raw)) {
        return raw;
    }

    return "jpg";
}

function createPipeline(sourceBuffer: Buffer) {
    return sharp(sourceBuffer, {
        limitInputPixels: SHARP_LIMIT_INPUT_PIXELS,
    }).rotate();
}

async function optimizeWithFallback(
    sourceBuffer: Buffer,
    fallbackExtension: string,
    targetExtension: string,
    buildOptimizedBuffer: () => Promise<Buffer>
): Promise<OptimizedImage> {
    try {
        const optimizedBuffer = await buildOptimizedBuffer();

        if (!optimizedBuffer.length) {
            return {
                buffer: sourceBuffer,
                extension: normalizeExtension(fallbackExtension),
            };
        }

        return {
            buffer: optimizedBuffer,
            extension: normalizeExtension(targetExtension),
        };
    } catch (error) {
        console.warn("[IMAGE_OPTIMIZER] fallback to original buffer", error);
        return {
            buffer: sourceBuffer,
            extension: normalizeExtension(fallbackExtension),
        };
    }
}

export async function optimizeAvatarImage(
    sourceBuffer: Buffer,
    fallbackExtension: string
): Promise<OptimizedImage> {
    return optimizeWithFallback(
        sourceBuffer,
        fallbackExtension,
        "webp",
        async () => {
            return createPipeline(sourceBuffer)
                .resize({
                    width: 512,
                    height: 512,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality: 72, effort: 4 })
                .toBuffer();
        }
    );
}

export async function optimizeProofImage(
    sourceBuffer: Buffer,
    fallbackExtension: string
): Promise<OptimizedImage> {
    return optimizeWithFallback(
        sourceBuffer,
        fallbackExtension,
        "webp",
        async () => {
            return createPipeline(sourceBuffer)
                .resize({
                    width: 1280,
                    height: 1280,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality: 76, effort: 4 })
                .toBuffer();
        }
    );
}

export async function optimizeQrisStaticImage(
    sourceBuffer: Buffer,
    fallbackExtension: string
): Promise<OptimizedImage> {
    return optimizeWithFallback(
        sourceBuffer,
        fallbackExtension,
        "png",
        async () => {
            return createPipeline(sourceBuffer)
                .resize({
                    width: 1024,
                    height: 1024,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .png({
                    compressionLevel: 9,
                    palette: true,
                    quality: 100,
                })
                .toBuffer();
        }
    );
}

export async function optimizeQrisDynamicImage(
    sourceBuffer: Buffer,
    fallbackExtension: string
): Promise<OptimizedImage> {
    return optimizeWithFallback(
        sourceBuffer,
        fallbackExtension,
        "png",
        async () => {
            return createPipeline(sourceBuffer)
                .png({
                    compressionLevel: 9,
                    palette: true,
                    quality: 100,
                })
                .toBuffer();
        }
    );
}