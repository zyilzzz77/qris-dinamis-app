/**
 * app/api/auth/[...nextauth]/route.ts
 * NextAuth v5 handler for Next.js 16
 */

import { handlers } from "@/lib/auth";
import { logApiRequest } from "@/lib/api-request-log";

export async function GET(request: Request) {
    await logApiRequest({
        request,
        endpoint: "/api/auth/[...nextauth]",
        userId: null,
    });

    return handlers.GET(request);
}

export async function POST(request: Request) {
    await logApiRequest({
        request,
        endpoint: "/api/auth/[...nextauth]",
        userId: null,
    });

    return handlers.POST(request);
}
