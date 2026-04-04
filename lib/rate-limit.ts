type RateLimitOptions = {
    keyPrefix: string;
    windowMs: number;
    maxRequests: number;
};

export type RateLimitResult = {
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
    retryAfter: number;
};

type RateLimitRecord = {
    count: number;
    resetAt: number;
};

declare global {
    var __qrisRateLimitStore: Map<string, RateLimitRecord> | undefined;
    var __qrisRateLimitLastCleanup: number | undefined;
}

const STORE: Map<string, RateLimitRecord> =
    globalThis.__qrisRateLimitStore ?? new Map<string, RateLimitRecord>();

globalThis.__qrisRateLimitStore = STORE;

const CLEANUP_INTERVAL_MS = 60_000;

function getIpFromRequest(request: Request): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp.trim();
    }

    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) {
        return cfIp.trim();
    }

    return "unknown";
}

function cleanupExpiredRecords(now: number) {
    const lastCleanup = globalThis.__qrisRateLimitLastCleanup ?? 0;
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
        return;
    }

    for (const [key, value] of STORE.entries()) {
        if (value.resetAt <= now) {
            STORE.delete(key);
        }
    }

    globalThis.__qrisRateLimitLastCleanup = now;
}

export function checkRateLimit(
    request: Request,
    options: RateLimitOptions
): RateLimitResult {
    const now = Date.now();
    cleanupExpiredRecords(now);

    const ip = getIpFromRequest(request);
    const key = `${options.keyPrefix}:${ip}`;
    const existing = STORE.get(key);

    if (!existing || existing.resetAt <= now) {
        const resetAt = now + options.windowMs;
        STORE.set(key, { count: 1, resetAt });

        return {
            allowed: true,
            limit: options.maxRequests,
            remaining: Math.max(0, options.maxRequests - 1),
            reset: Math.ceil(resetAt / 1000),
            retryAfter: 0,
        };
    }

    if (existing.count >= options.maxRequests) {
        return {
            allowed: false,
            limit: options.maxRequests,
            remaining: 0,
            reset: Math.ceil(existing.resetAt / 1000),
            retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    STORE.set(key, existing);

    return {
        allowed: true,
        limit: options.maxRequests,
        remaining: Math.max(0, options.maxRequests - existing.count),
        reset: Math.ceil(existing.resetAt / 1000),
        retryAfter: 0,
    };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
    };

    if (!result.allowed && result.retryAfter > 0) {
        headers["Retry-After"] = String(result.retryAfter);
    }

    return headers;
}
