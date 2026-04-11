import nodemailer, { type Transporter } from "nodemailer";

type MailerConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string | null;
    pass: string | null;
    from: string;
    fromName: string;
};

declare global {
    var __qrisMailerTransporter: Transporter | undefined;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
    if (typeof value !== "string") {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
    }

    return fallback;
}

function parsePort(value: string | undefined): number {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 587;
    }
    return parsed;
}

function getMailerConfig(): MailerConfig | null {
    const host = process.env.SMTP_HOST?.trim();
    const from = process.env.SMTP_FROM?.trim();

    if (!host || !from) {
        return null;
    }

    const user = process.env.SMTP_USER?.trim() || null;
    const pass = process.env.SMTP_PASS?.trim() || null;

    if (user && !pass) {
        throw new Error("SMTP_PASS wajib diisi saat SMTP_USER dipakai.");
    }

    return {
        host,
        from,
        user,
        pass,
        port: parsePort(process.env.SMTP_PORT),
        secure: parseBooleanEnv(process.env.SMTP_SECURE, false),
        fromName: process.env.SMTP_FROM_NAME?.trim() || "bikinqrisdinamis",
    };
}

function getFromHeader(config: MailerConfig): string {
    const safeName = config.fromName.replace(/"/g, "").trim();
    if (!safeName) {
        return config.from;
    }

    return `"${safeName}" <${config.from}>`;
}

export function isMailerConfigured(): boolean {
    return getMailerConfig() !== null;
}

function getMailerTransporter(): Transporter {
    if (globalThis.__qrisMailerTransporter) {
        return globalThis.__qrisMailerTransporter;
    }

    const config = getMailerConfig();
    if (!config) {
        throw new Error("SMTP belum dikonfigurasi. Isi SMTP_HOST dan SMTP_FROM.");
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user ? { user: config.user, pass: config.pass ?? "" } : undefined,
    });

    if (process.env.NODE_ENV !== "production") {
        globalThis.__qrisMailerTransporter = transporter;
    }

    return transporter;
}

export async function sendVerificationCodeEmail(params: {
    to: string;
    name: string | null;
    code: string;
    expiresInMinutes: number;
}): Promise<void> {
    const config = getMailerConfig();
    if (!config) {
        throw new Error("SMTP belum dikonfigurasi. Tidak bisa kirim email verifikasi.");
    }

    const transporter = getMailerTransporter();
    const displayName = params.name?.trim() || "Pengguna";

    await transporter.sendMail({
        from: getFromHeader(config),
        to: params.to,
        subject: "Kode verifikasi email bikinqrisdinamis",
        text: [
            `Halo ${displayName},`,
            "",
            "Kode verifikasi akun kamu:",
            params.code,
            "",
            `Kode berlaku ${params.expiresInMinutes} menit.`,
            "Jika kamu tidak merasa mendaftar, abaikan email ini.",
        ].join("\n"),
        html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>Halo <strong>${displayName}</strong>,</p>
        <p>Kode verifikasi akun kamu:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${params.code}</p>
        <p>Kode berlaku <strong>${params.expiresInMinutes} menit</strong>.</p>
        <p>Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
      </div>
    `,
    });
}