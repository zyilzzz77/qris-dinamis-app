import crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_REGEX = /^\d{6}$/;

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}

export const EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES = parsePositiveInt(
    process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES,
    10
);

export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = parsePositiveInt(
    process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    60
);

export const EMAIL_VERIFICATION_MAX_ATTEMPTS = parsePositiveInt(
    process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS,
    5
);

function getVerificationSecret(): string {
    return (
        process.env.EMAIL_VERIFICATION_SECRET ??
        process.env.AUTH_SECRET ??
        process.env.NEXTAUTH_SECRET ??
        "unsafe-email-verification-secret"
    );
}

export function normalizeEmailAddress(rawEmail: string): string {
    return String(rawEmail).trim().toLowerCase();
}

export function isValidEmailAddress(email: string): boolean {
    return EMAIL_REGEX.test(normalizeEmailAddress(email));
}

export function isValidEmailVerificationCode(code: string): boolean {
    return CODE_REGEX.test(String(code).trim());
}

export function generateEmailVerificationCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailVerificationCode(email: string, code: string): string {
    const normalizedEmail = normalizeEmailAddress(email);
    const normalizedCode = String(code).trim();
    const secret = getVerificationSecret();

    return crypto
        .createHash("sha256")
        .update(`${normalizedEmail}:${normalizedCode}:${secret}`)
        .digest("hex");
}

export function compareEmailVerificationCodeHash(
    email: string,
    code: string,
    storedHash: string
): boolean {
    try {
        const candidateHash = hashEmailVerificationCode(email, code);
        const candidateBuffer = Buffer.from(candidateHash, "hex");
        const storedBuffer = Buffer.from(storedHash, "hex");

        if (candidateBuffer.length !== storedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
    } catch {
        return false;
    }
}

export function buildEmailVerificationData(email: string): {
    code: string;
    codeHash: string;
    expiresAt: Date;
    sentAt: Date;
} {
    const code = generateEmailVerificationCode();
    const codeHash = hashEmailVerificationCode(email, code);
    const now = Date.now();

    return {
        code,
        codeHash,
        expiresAt: new Date(now + EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES * 60_000),
        sentAt: new Date(now),
    };
}

export function isEmailVerificationCodeExpired(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) {
        return true;
    }

    return expiresAt.getTime() <= Date.now();
}

export function getResendCooldownSeconds(
    sentAt: Date | null | undefined,
    nowMs = Date.now()
): number {
    if (!sentAt) {
        return 0;
    }

    const elapsedMs = nowMs - sentAt.getTime();
    const remainingMs = EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;

    if (remainingMs <= 0) {
        return 0;
    }

    return Math.ceil(remainingMs / 1000);
}