import { NextRequest, NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/seo";
import {
    getSupportEvidenceRetentionDays,
    removeSupportEvidenceIfExpired,
} from "@/lib/support-evidence-retention";

type RouteParams = {
    path: string[];
};

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, { status });
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

function isUnsafePathSegment(segment: string): boolean {
    const trimmed = segment.trim();
    return !trimmed || trimmed === "." || trimmed === ".." || trimmed.includes("/") || trimmed.includes("\\");
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<RouteParams> }
) {
    const { path: rawSegments } = await context.params;

    if (!Array.isArray(rawSegments) || rawSegments.length < 2) {
        return jsonResponse({ success: false, error: "Path bukti laporan tidak valid." }, 400);
    }

    const decodedSegments = decodePathSegments(rawSegments);
    if (decodedSegments.some(isUnsafePathSegment)) {
        return jsonResponse({ success: false, error: "Path bukti laporan tidak valid." }, 400);
    }

    const relativeEvidencePath = `buktilaporan/${decodedSegments.join("/")}`;
    const wasExpiredAndDeleted = await removeSupportEvidenceIfExpired({
        relativePath: relativeEvidencePath,
    });

    if (wasExpiredAndDeleted) {
        return jsonResponse(
            {
                success: false,
                error: `Link bukti laporan sudah kedaluwarsa (${getSupportEvidenceRetentionDays()} hari) dan file sudah dihapus otomatis.`,
            },
            410
        );
    }

    const encodedSegments = decodedSegments.map((segment) => encodeURIComponent(segment));
    const destinationPath = `/api/files/buktilaporan/${encodedSegments.join("/")}`;
    const destinationUrl = new URL(destinationPath, getRequestOrigin(request));

    return NextResponse.redirect(destinationUrl, 302);
}
