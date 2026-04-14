import { createHash, randomUUID } from "node:crypto";

import { sendNewDeviceLoginAlertEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

type NotifyNewLoginDeviceInput = {
    userId: string;
    userEmail: string;
    userName: string | null;
    request: Request;
};

type ParsedBrowser = {
    family: string;
    label: string;
};

type ParsedClientInfo = {
    browser: ParsedBrowser;
    osFamily: string;
    deviceType: "Desktop" | "Mobile" | "Tablet" | "Bot" | "Unknown";
    ip: string;
    userAgent: string | null;
    userAgentSignature: string;
};

declare global {
    var __userLoginDeviceTableReady: boolean | undefined;
    var __userLoginDeviceTableInitPromise: Promise<void> | undefined;
}

function trimOrNull(value: string | null | undefined, maxLength: number): string | null {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    return trimmed.slice(0, maxLength);
}

function normalizeCandidateIp(rawValue: string): string | null {
    const trimmed = rawValue.trim();
    if (!trimmed) {
        return null;
    }

    let withoutPort = trimmed;

    if (withoutPort.startsWith("[") && withoutPort.includes("]")) {
        withoutPort = withoutPort.slice(1, withoutPort.indexOf("]"));
    } else if (withoutPort.includes(".") && withoutPort.includes(":")) {
        const lastColon = withoutPort.lastIndexOf(":");
        const maybePort = withoutPort.slice(lastColon + 1);
        if (/^\d{1,5}$/.test(maybePort)) {
            withoutPort = withoutPort.slice(0, lastColon);
        }
    }

    const normalized = withoutPort.trim().toLowerCase();
    if (!normalized || normalized.length > 64) {
        return null;
    }

    if (!/^[a-f0-9:.]+$/.test(normalized)) {
        return null;
    }

    return normalized;
}

function getRequestIp(request: Request): string {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) {
        const normalized = normalizeCandidateIp(cfIp);
        if (normalized) {
            return normalized;
        }
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        const normalized = normalizeCandidateIp(realIp);
        if (normalized) {
            return normalized;
        }
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const firstIp = forwardedFor.split(",")[0] ?? "";
        const normalized = normalizeCandidateIp(firstIp);
        if (normalized) {
            return normalized;
        }
    }

    return "unknown";
}

function parseBrowser(userAgent: string | null): ParsedBrowser {
    if (!userAgent) {
        return {
            family: "Unknown",
            label: "Unknown Browser",
        };
    }

    const definitions: Array<{ pattern: RegExp; family: string }> = [
        { pattern: /(edg|edgios|edga)\/([\d.]+)/i, family: "Microsoft Edge" },
        { pattern: /(opr|opera)\/([\d.]+)/i, family: "Opera" },
        { pattern: /samsungbrowser\/([\d.]+)/i, family: "Samsung Internet" },
        { pattern: /(crios|chrome)\/([\d.]+)/i, family: "Google Chrome" },
        { pattern: /(fxios|firefox)\/([\d.]+)/i, family: "Mozilla Firefox" },
        { pattern: /version\/([\d.]+).*safari/i, family: "Safari" },
        { pattern: /(msie\s|trident\/.*rv:)([\d.]+)/i, family: "Internet Explorer" },
    ];

    for (const definition of definitions) {
        const match = userAgent.match(definition.pattern);
        if (!match) {
            continue;
        }

        const version = match[2] || match[1] || "";
        const majorVersion = version.split(".")[0]?.trim();

        return {
            family: definition.family,
            label: majorVersion ? `${definition.family} ${majorVersion}` : definition.family,
        };
    }

    return {
        family: "Other",
        label: "Other Browser",
    };
}

function parseOsFamily(userAgent: string | null): string {
    if (!userAgent) {
        return "Unknown OS";
    }

    if (/windows nt/i.test(userAgent)) {
        return "Windows";
    }

    if (/android/i.test(userAgent)) {
        return "Android";
    }

    if (/(iphone|ipad|ipod)/i.test(userAgent)) {
        return "iOS";
    }

    if (/mac os x|macintosh/i.test(userAgent)) {
        return "macOS";
    }

    if (/linux/i.test(userAgent)) {
        return "Linux";
    }

    return "Other OS";
}

function parseDeviceType(userAgent: string | null): ParsedClientInfo["deviceType"] {
    if (!userAgent) {
        return "Unknown";
    }

    if (/(bot|spider|crawl|slurp|facebookexternalhit|headless)/i.test(userAgent)) {
        return "Bot";
    }

    if (/tablet|ipad/i.test(userAgent)) {
        return "Tablet";
    }

    if (/mobile|iphone|ipod|android/i.test(userAgent)) {
        return "Mobile";
    }

    return "Desktop";
}

function normalizeUserAgentForSignature(userAgent: string | null): string {
    if (!userAgent) {
        return "unknown";
    }

    return userAgent
        .toLowerCase()
        .replace(/\d+(?:\.\d+)+/g, "<ver>")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
}

function parseClientInfo(request: Request): ParsedClientInfo {
    const userAgent = trimOrNull(request.headers.get("user-agent"), 255);

    return {
        browser: parseBrowser(userAgent),
        osFamily: parseOsFamily(userAgent),
        deviceType: parseDeviceType(userAgent),
        ip: getRequestIp(request),
        userAgent,
        userAgentSignature: normalizeUserAgentForSignature(userAgent),
    };
}

function buildDeviceSignature(info: ParsedClientInfo): string {
    const seed = [
        info.browser.family.toLowerCase(),
        info.osFamily.toLowerCase(),
        info.deviceType.toLowerCase(),
        info.userAgentSignature,
    ].join("|");

    return createHash("sha256").update(seed).digest("hex");
}

function isUniqueConstraintError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);

    return (
        message.includes("UNIQUE constraint failed") &&
        message.includes("UserLoginDevice") &&
        message.includes("deviceSignature")
    );
}

async function ensureUserLoginDeviceTable(): Promise<void> {
    if (globalThis.__userLoginDeviceTableReady) {
        return;
    }

    if (!globalThis.__userLoginDeviceTableInitPromise) {
        globalThis.__userLoginDeviceTableInitPromise = (async () => {
            await prisma.$executeRawUnsafe(
                `CREATE TABLE IF NOT EXISTS "UserLoginDevice" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "deviceSignature" TEXT NOT NULL,
          "browser" TEXT NOT NULL,
          "osFamily" TEXT NOT NULL,
          "deviceType" TEXT NOT NULL,
          "userAgent" TEXT,
          "lastIp" TEXT,
          "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        )`
            );

            await prisma.$executeRawUnsafe(
                `CREATE UNIQUE INDEX IF NOT EXISTS "UserLoginDevice_userId_deviceSignature_key"
        ON "UserLoginDevice" ("userId", "deviceSignature")`
            );

            await prisma.$executeRawUnsafe(
                `CREATE INDEX IF NOT EXISTS "UserLoginDevice_userId_lastSeenAt_idx"
        ON "UserLoginDevice" ("userId", "lastSeenAt")`
            );

            globalThis.__userLoginDeviceTableReady = true;
        })().catch((error) => {
            globalThis.__userLoginDeviceTableInitPromise = undefined;
            throw error;
        });
    }

    await globalThis.__userLoginDeviceTableInitPromise;
}

async function touchKnownDevice(params: {
    userId: string;
    deviceSignature: string;
    ip: string;
    userAgent: string | null;
    seenAtIso: string;
}): Promise<void> {
    await prisma.$executeRawUnsafe(
        `UPDATE "UserLoginDevice"
       SET "lastSeenAt" = ?, "lastIp" = ?, "userAgent" = ?
       WHERE "userId" = ? AND "deviceSignature" = ?`,
        params.seenAtIso,
        params.ip,
        params.userAgent,
        params.userId,
        params.deviceSignature
    );
}

export async function notifyIfNewLoginDevice(input: NotifyNewLoginDeviceInput): Promise<void> {
    try {
        await ensureUserLoginDeviceTable();

        const clientInfo = parseClientInfo(input.request);
        const deviceSignature = buildDeviceSignature(clientInfo);
        const seenAt = new Date();
        const seenAtIso = seenAt.toISOString();

        const existingDevice = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT "id"
       FROM "UserLoginDevice"
       WHERE "userId" = ? AND "deviceSignature" = ?
       LIMIT 1`,
            input.userId,
            deviceSignature
        );

        if (existingDevice.length > 0) {
            await touchKnownDevice({
                userId: input.userId,
                deviceSignature,
                ip: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                seenAtIso,
            });
            return;
        }

        try {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "UserLoginDevice" (
          "id", "userId", "deviceSignature", "browser", "osFamily", "deviceType", "userAgent", "lastIp", "firstSeenAt", "lastSeenAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                randomUUID(),
                input.userId,
                deviceSignature,
                clientInfo.browser.label,
                clientInfo.osFamily,
                clientInfo.deviceType,
                clientInfo.userAgent,
                clientInfo.ip,
                seenAtIso,
                seenAtIso
            );
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                await touchKnownDevice({
                    userId: input.userId,
                    deviceSignature,
                    ip: clientInfo.ip,
                    userAgent: clientInfo.userAgent,
                    seenAtIso,
                });
                return;
            }

            throw error;
        }

        await sendNewDeviceLoginAlertEmail({
            to: input.userEmail,
            name: input.userName,
            browser: clientInfo.browser.label,
            osFamily: clientInfo.osFamily,
            deviceType: clientInfo.deviceType,
            ipAddress: clientInfo.ip,
            loginAt: seenAt,
        });
    } catch (error) {
        console.error("[LOGIN_DEVICE_NOTIFICATION]", error);
    }
}