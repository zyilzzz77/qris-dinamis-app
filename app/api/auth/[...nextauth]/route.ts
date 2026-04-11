/**
 * app/api/auth/[...nextauth]/route.ts
 * NextAuth v5 handler for Next.js 16
 */

import { handlers } from "@/lib/auth";
import { logApiRequest } from "@/lib/api-request-log";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

function logAuthRequestSafe(request: NextRequest) {
    void logApiRequest({
        request,
        endpoint: "/api/auth/[...nextauth]",
        userId: null,
    }).catch((error) => {
        console.error("[auth] logApiRequest failed:", error);
    });
}

function tooManyAuthRequestsHeaders(baseHeaders: Record<string, string>) {
    return {
        ...baseHeaders,
        "Cache-Control": "no-store",
    };
}

export async function GET(request: NextRequest) {
    const rateLimit = checkRateLimit(request, {
        keyPrefix: "auth-nextauth-get",
        windowMs: 60_000,
        maxRequests: 120,
    });

    if (!rateLimit.allowed) {
        return Response.json(
            {
                success: false,
                error: "Terlalu banyak request auth. Coba lagi beberapa saat.",
            },
            {
                status: 429,
                headers: tooManyAuthRequestsHeaders(rateLimitHeaders(rateLimit)),
            }
        );
    }

    try {
        return await handlers.GET(request);
    } finally {
        logAuthRequestSafe(request);
    }
}

export async function POST(request: NextRequest) {
    const isCredentialsCallback = request.nextUrl.pathname.endsWith("/callback/credentials");

    const rateLimit = checkRateLimit(request, {
        keyPrefix: isCredentialsCallback
            ? "auth-nextauth-post-credentials"
            : "auth-nextauth-post",
        windowMs: 60_000,
        maxRequests: isCredentialsCallback ? 10 : 30,
    });

    if (!rateLimit.allowed) {
        return Response.json(
            {
                success: false,
                error: "Terlalu banyak request auth. Coba lagi beberapa saat.",
            },
            {
                status: 429,
                headers: tooManyAuthRequestsHeaders(rateLimitHeaders(rateLimit)),
            }
        );
    }

    try {
        return await handlers.POST(request);
    } finally {
        logAuthRequestSafe(request);
    }
}