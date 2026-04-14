/**
 * app/api/[userId]/[qrisId]/[nominal]/route.ts
 * Public GET endpoint for external websites to request dynamic QRIS.
 *
 * Example:
 * GET /api/<userId>/<qrisId>/<nominal>
 */

import { NextRequest } from "next/server";
import {
    CORS_HEADERS,
    handlePublicQrisGenerateRequest,
    type RouteParams,
} from "./controller";

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<RouteParams> }
) {
    return handlePublicQrisGenerateRequest(request, context.params);
}
