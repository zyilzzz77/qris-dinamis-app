/**
 * proxy.ts — Next.js 16 auth protection (renamed from middleware.ts)
 * Protects /dashboard/* and related authenticated routes
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

type RateLimitRule = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function isPublicGeneratePath(pathname: string): boolean {
  return /^\/api\/[^/]+\/[^/]+\/[^/]+$/.test(pathname);
}

function buildApiRateLimitRules(pathname: string, method: string): RateLimitRule[] {
  const normalizedMethod = method.toUpperCase();

  const rules: RateLimitRule[] = [
    { keyPrefix: "api-global-burst", windowMs: 10_000, maxRequests: 35 },
    { keyPrefix: "api-global-minute", windowMs: 60_000, maxRequests: 180 },
  ];

  if (pathname === "/api/auth/register" && normalizedMethod === "POST") {
    rules.push(
      { keyPrefix: "api-auth-register-1m", windowMs: 60_000, maxRequests: 5 },
      { keyPrefix: "api-auth-register-15m", windowMs: 15 * 60_000, maxRequests: 20 }
    );
  }

  if (pathname.startsWith("/api/auth") && normalizedMethod === "POST") {
    rules.push({ keyPrefix: "api-auth-post", windowMs: 60_000, maxRequests: 20 });
  }

  if (pathname === "/api/qris/upload" && normalizedMethod === "POST") {
    rules.push({ keyPrefix: "api-qris-upload", windowMs: 60_000, maxRequests: 10 });
  }

  if (pathname === "/api/qris/generate" && normalizedMethod === "POST") {
    rules.push({ keyPrefix: "api-qris-generate", windowMs: 60_000, maxRequests: 15 });
  }

  if (isPublicGeneratePath(pathname) && normalizedMethod === "GET") {
    rules.push({ keyPrefix: "api-public-generate", windowMs: 60_000, maxRequests: 12 });
  }

  if (pathname.includes("/api/payment/") && pathname.endsWith("/status") && normalizedMethod === "GET") {
    rules.push({ keyPrefix: "api-payment-status", windowMs: 60_000, maxRequests: 30 });
  }

  if (pathname.includes("/api/payment/") && pathname.endsWith("/proof") && normalizedMethod === "POST") {
    rules.push({ keyPrefix: "api-payment-proof", windowMs: 60_000, maxRequests: 8 });
  }

  if (pathname.includes("/api/payment/") && pathname.endsWith("/confirm") && normalizedMethod === "POST") {
    rules.push({ keyPrefix: "api-payment-confirm", windowMs: 60_000, maxRequests: 8 });
  }

  return rules;
}

function tooManyRequestsResponse(
  rateLimitHeadersMap: Record<string, string>
) {
  return NextResponse.json(
    {
      success: false,
      error: "Terlalu banyak request. Coba lagi beberapa saat.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        ...API_CORS_HEADERS,
        ...rateLimitHeadersMap,
        "Cache-Control": "no-store",
      },
    }
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    if (request.method.toUpperCase() === "OPTIONS") {
      return NextResponse.next();
    }

    const rateLimitRules = buildApiRateLimitRules(pathname, request.method);

    for (const rule of rateLimitRules) {
      const rateLimitResult = checkRateLimit(request, rule);
      if (!rateLimitResult.allowed) {
        return tooManyRequestsResponse(rateLimitHeaders(rateLimitResult));
      }
    }
  }

  // Check for auth session token
  const sessionToken =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/transaction") ||
    pathname.startsWith("/rest-api") ||
    pathname.startsWith("/contact-us");

  // Redirect unauthenticated users to sign-in
  if (isProtectedRoute && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Note: we intentionally do not redirect from /sign-in or /sign-up based on
  // cookie presence alone. A stale/invalid JWT cookie can still exist and would
  // otherwise cause redirect loops between auth and protected routes.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
