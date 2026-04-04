/**
 * proxy.ts — Next.js 16 auth protection (renamed from middleware.ts)
 * Protects /dashboard/* and related authenticated routes
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
