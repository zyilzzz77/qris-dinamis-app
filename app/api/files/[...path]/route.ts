import fs from "fs/promises";
import nodePath from "path";
import { resolveUploadAbsolutePath } from "@/lib/storage";

type RouteParams = {
    path: string[];
};

const MIME_TYPES: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
};

export const runtime = "nodejs";

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, { status });
}

function getMimeType(filePath: string): string {
    const ext = nodePath.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] ?? "application/octet-stream";
}

function decodePathSegments(segments: string[]): string[] {
    return segments.map((segment) => {
        try {
            return decodeURIComponent(segment);
        } catch {
            return segment;
        }
    });
}

export async function GET(
    _request: Request,
    context: { params: Promise<RouteParams> }
) {
    try {
        const { path: rawSegments } = await context.params;

        if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
            return jsonResponse({ success: false, error: "Path file tidak valid." }, 400);
        }

        const relativePath = decodePathSegments(rawSegments).join("/");
        const absolutePath = resolveUploadAbsolutePath(relativePath);

        if (!absolutePath) {
            return jsonResponse({ success: false, error: "Path file tidak valid." }, 400);
        }

        const fileBuffer = await fs.readFile(absolutePath);

        return new Response(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": getMimeType(absolutePath),
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return jsonResponse({ success: false, error: "File tidak ditemukan." }, 404);
        }

        console.error("[FILES_GET]", error);
        return jsonResponse({ success: false, error: "Gagal memuat file." }, 500);
    }
}
