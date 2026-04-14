import crypto from "crypto";
import { normalizeEmailAddress } from "@/lib/email-verification";

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

export const PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = parsePositiveInt(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
    10
);

function getPasswordResetSecret(): string {
    return (
        process.env.PASSWORD_RESET_SECRET ??
        process.env.EMAIL_VERIFICATION_SECRET ??
        process.env.AUTH_SECRET ??
        process.env.NEXTAUTH_SECRET ??
        "unsafe-password-reset-secret"
    );
}

type PasswordResetTokenPayload = {
    email: string;
    passwordFingerprint: string;
    exp: number;
};

export type PasswordResetTokenValidationResult =
    | {
        valid: true;
        email: string;
        passwordFingerprint: string;
        expiresAt: Date;
    }
    | {
        valid: false;
        reason: "malformed" | "invalid-signature" | "expired" | "invalid-payload";
    };

export function buildPasswordHashFingerprint(passwordHash: string): string {
    return crypto
        .createHash("sha256")
        .update(String(passwordHash ?? ""))
        .digest("hex")
        .slice(0, 24);
}

function encodePayload(payload: PasswordResetTokenPayload): string {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(payloadPart: string): PasswordResetTokenPayload | null {
    try {
        const raw = Buffer.from(payloadPart, "base64url").toString("utf8");
        const parsed = JSON.parse(raw) as Partial<PasswordResetTokenPayload>;

        const email = normalizeEmailAddress(String(parsed.email ?? ""));
        const passwordFingerprint = String(parsed.passwordFingerprint ?? "").trim();
        const exp = Number(parsed.exp);

        if (!email) {
            return null;
        }

        if (!/^[a-f0-9]{24}$/i.test(passwordFingerprint)) {
            return null;
        }

        if (!Number.isFinite(exp) || exp <= 0) {
            return null;
        }

        return {
            email,
            passwordFingerprint: passwordFingerprint.toLowerCase(),
            exp,
        };
    } catch {
        return null;
    }
}

function signPayload(payloadPart: string): Buffer {
    return crypto.createHmac("sha256", getPasswordResetSecret()).update(payloadPart).digest();
}

export function createPasswordResetToken(params: {
    email: string;
    passwordHash: string;
    expiresInMinutes?: number;
    now?: number;
}): string {
    const issuedAt = params.now ?? Date.now();
    const requestedExpiresInMinutes = Number(params.expiresInMinutes);
    const expiresInMinutes =
        Number.isFinite(requestedExpiresInMinutes) && requestedExpiresInMinutes > 0
            ? Math.floor(requestedExpiresInMinutes)
            : PASSWORD_RESET_TOKEN_EXPIRES_MINUTES;

    const payloadPart = encodePayload({
        email: normalizeEmailAddress(params.email),
        passwordFingerprint: buildPasswordHashFingerprint(params.passwordHash),
        exp: issuedAt + expiresInMinutes * 60_000,
    });

    const signaturePart = signPayload(payloadPart).toString("hex");
    return `${payloadPart}.${signaturePart}`;
}

export function validatePasswordResetToken(
    token: string,
    now = Date.now()
): PasswordResetTokenValidationResult {
    const [payloadPart, signaturePart] = String(token ?? "").trim().split(".");

    if (!payloadPart || !signaturePart) {
        return { valid: false, reason: "malformed" };
    }

    if (!/^[a-f0-9]{64}$/i.test(signaturePart)) {
        return { valid: false, reason: "invalid-signature" };
    }

    const expectedSignature = signPayload(payloadPart);
    const providedSignature = Buffer.from(signaturePart, "hex");

    if (providedSignature.length !== expectedSignature.length) {
        return { valid: false, reason: "invalid-signature" };
    }

    if (!crypto.timingSafeEqual(providedSignature, expectedSignature)) {
        return { valid: false, reason: "invalid-signature" };
    }

    const payload = decodePayload(payloadPart);
    if (!payload) {
        return { valid: false, reason: "invalid-payload" };
    }

    if (payload.exp <= now) {
        return { valid: false, reason: "expired" };
    }

    return {
        valid: true,
        email: payload.email,
        passwordFingerprint: payload.passwordFingerprint,
        expiresAt: new Date(payload.exp),
    };
}
