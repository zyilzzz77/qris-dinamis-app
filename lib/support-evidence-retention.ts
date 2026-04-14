import fs from "fs/promises";
import type { Dirent } from "fs";

import { resolveUploadAbsolutePath } from "@/lib/storage";

const SUPPORT_EVIDENCE_ROOT = "buktilaporan";
const SUPPORT_EVIDENCE_RETENTION_DAYS = 30;
const SUPPORT_EVIDENCE_MAX_AGE_MS = SUPPORT_EVIDENCE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function normalizeRelativePath(input: string): string {
    return input
        .replace(/\\/g, "/")
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean)
        .join("/");
}

function isSupportEvidencePath(relativePath: string): boolean {
    return relativePath === SUPPORT_EVIDENCE_ROOT ||
        relativePath.startsWith(`${SUPPORT_EVIDENCE_ROOT}/`);
}

function isExpiredByMtime(mtimeMs: number, nowMs: number): boolean {
    return nowMs - mtimeMs >= SUPPORT_EVIDENCE_MAX_AGE_MS;
}

export function getSupportEvidenceRetentionDays(): number {
    return SUPPORT_EVIDENCE_RETENTION_DAYS;
}

export async function removeSupportEvidenceIfExpired(params: {
    relativePath: string;
    nowMs?: number;
}): Promise<boolean> {
    const normalizedPath = normalizeRelativePath(params.relativePath);
    if (!isSupportEvidencePath(normalizedPath)) {
        return false;
    }

    const absolutePath = resolveUploadAbsolutePath(normalizedPath);
    if (!absolutePath) {
        return false;
    }

    try {
        const stats = await fs.stat(absolutePath);
        if (!stats.isFile()) {
            return false;
        }

        const nowMs = params.nowMs ?? Date.now();
        if (!isExpiredByMtime(stats.mtimeMs, nowMs)) {
            return false;
        }

        try {
            await fs.unlink(absolutePath);
        } catch (unlinkError) {
            if (
                typeof unlinkError === "object" &&
                unlinkError !== null &&
                "code" in unlinkError &&
                unlinkError.code === "ENOENT"
            ) {
                return true;
            }

            throw unlinkError;
        }

        return true;
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return false;
        }

        throw error;
    }
}

export async function cleanupExpiredSupportEvidenceForUser(userId: string): Promise<number> {
    const userEvidenceDir = resolveUploadAbsolutePath(`${SUPPORT_EVIDENCE_ROOT}/${userId}`);
    if (!userEvidenceDir) {
        return 0;
    }

    let entries: Dirent[];
    try {
        entries = await fs.readdir(userEvidenceDir, { withFileTypes: true });
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return 0;
        }

        throw error;
    }

    const nowMs = Date.now();
    let deletedCount = 0;

    for (const entry of entries) {
        if (!entry.isFile()) {
            continue;
        }

        const deleted = await removeSupportEvidenceIfExpired({
            relativePath: `${SUPPORT_EVIDENCE_ROOT}/${userId}/${entry.name}`,
            nowMs,
        });

        if (deleted) {
            deletedCount += 1;
        }
    }

    return deletedCount;
}