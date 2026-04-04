import { prisma } from "@/lib/prisma";

type ApiRequestLogInput = {
    request: Request;
    endpoint?: string;
    method?: string;
    userId?: string | null;
    statusCode?: number | null;
};

declare global {
    var __apiRequestLogTableReady: boolean | undefined;
    var __apiRequestLogTableInitPromise: Promise<void> | undefined;
}

function trimOrNull(value: string | null | undefined, maxLength: number): string | null {
    if (!value) {
        return null;
    }

    const normalized = value.trim();
    if (!normalized) {
        return null;
    }

    return normalized.slice(0, maxLength);
}

function getIpFromRequest(request: Request): string | null {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const firstIp = forwardedFor.split(",")[0]?.trim();
        return trimOrNull(firstIp, 64);
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return trimOrNull(realIp, 64);
    }

    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) {
        return trimOrNull(cfIp, 64);
    }

    return null;
}

function resolveEndpoint(request: Request, endpoint?: string): string {
    if (endpoint && endpoint.trim()) {
        return endpoint.trim().slice(0, 191);
    }

    try {
        return new URL(request.url).pathname.slice(0, 191);
    } catch {
        return "/unknown";
    }
}

export async function ensureApiRequestLogTable(): Promise<void> {
    if (globalThis.__apiRequestLogTableReady) {
        return;
    }

    if (!globalThis.__apiRequestLogTableInitPromise) {
        globalThis.__apiRequestLogTableInitPromise = (async () => {
            await prisma.$executeRawUnsafe(
                `CREATE TABLE IF NOT EXISTS "ApiRequestLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT,
          "endpoint" TEXT NOT NULL,
          "method" TEXT NOT NULL,
          "statusCode" INTEGER,
          "ip" TEXT,
          "userAgent" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
            );

            await prisma.$executeRawUnsafe(
                `CREATE INDEX IF NOT EXISTS "ApiRequestLog_userId_createdAt_idx"
        ON "ApiRequestLog" ("userId", "createdAt")`
            );

            await prisma.$executeRawUnsafe(
                `CREATE INDEX IF NOT EXISTS "ApiRequestLog_endpoint_createdAt_idx"
        ON "ApiRequestLog" ("endpoint", "createdAt")`
            );

            globalThis.__apiRequestLogTableReady = true;
        })().catch((error) => {
            globalThis.__apiRequestLogTableInitPromise = undefined;
            throw error;
        });
    }

    await globalThis.__apiRequestLogTableInitPromise;
}

export async function logApiRequest(input: ApiRequestLogInput): Promise<void> {
    try {
        await ensureApiRequestLogTable();

        const endpoint = resolveEndpoint(input.request, input.endpoint);
        const method = (input.method || input.request.method || "GET").toUpperCase().slice(0, 16);
        const userAgent = trimOrNull(input.request.headers.get("user-agent"), 255);
        const ip = getIpFromRequest(input.request);
        const statusCode =
            typeof input.statusCode === "number" && Number.isFinite(input.statusCode)
                ? Math.round(input.statusCode)
                : null;

        await prisma.$executeRawUnsafe(
            `INSERT INTO "ApiRequestLog" ("id", "userId", "endpoint", "method", "statusCode", "ip", "userAgent", "createdAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            crypto.randomUUID(),
            input.userId ?? null,
            endpoint,
            method,
            statusCode,
            ip,
            userAgent,
            new Date().toISOString()
        );
    } catch (error) {
        console.error("[API_REQUEST_LOG_WRITE]", error);
    }
}

export async function countApiRequestsByUserAndRange(
    userId: string,
    startAt: Date,
    endAt: Date
): Promise<number> {
    try {
        await ensureApiRequestLogTable();

        const rows = await prisma.$queryRawUnsafe<Array<{ total: number | string }>>(
            `SELECT COUNT(*) as total
       FROM "ApiRequestLog"
       WHERE "userId" = ?
       AND "createdAt" >= ?
       AND "createdAt" < ?`,
            userId,
            startAt.toISOString(),
            endAt.toISOString()
        );

        return Number(rows[0]?.total ?? 0);
    } catch (error) {
        console.error("[API_REQUEST_LOG_COUNT]", error);
        return 0;
    }
}
