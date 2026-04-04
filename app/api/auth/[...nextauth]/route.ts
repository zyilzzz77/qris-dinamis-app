/**
 * app/api/auth/[...nextauth]/route.ts
 * NextAuth v5 handler for Next.js 16
 */

import { handlers } from "@/lib/auth";
import { logApiRequest } from "@/lib/api-request-log";

type NextAuthContext = {
    params: Promise<{ nextauth: string[] }>;
};

export async function GET(request: Request, context: NextAuthContext) {
    await logApiRequest({
        request,
        endpoint: "/api/auth/[...nextauth]",
        userId: null,
    });

    return handlers.GET(request, context);
}

export async function POST(request: Request, context: NextAuthContext) {
    await logApiRequest({
        request,
        endpoint: "/api/auth/[...nextauth]",
        userId: null,
    });

    return handlers.POST(request, context);
}
