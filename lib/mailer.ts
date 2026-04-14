import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

type MailerConfig = {
    host: string;
    port: number;
    secure: boolean;
    fallbackAuthUser: string | null;
    fallbackAuthPass: string | null;
    defaultSender: SenderConfig;
    senders: {
        alert: SenderConfig;
        notification: SenderConfig;
        customerService: SenderConfig;
    };
};

type SenderConfig = {
    email: string;
    name: string;
    smtpUser: string | null;
    smtpPass: string | null;
};

type SenderType = keyof MailerConfig["senders"];

declare global {
    var __qrisMailerTransporterByAuth: Map<string, Transporter> | undefined;
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

function parseSenderEmail(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    if (!normalized) {
        return fallback;
    }

    return normalized;
}

function parseSenderName(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    if (!normalized) {
        return fallback;
    }

    return normalized;
}

function parseAuthUser(value: string | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) {
        return null;
    }

    return normalized;
}

function parseAuthPass(value: string | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) {
        return null;
    }

    return normalized;
}

function buildSenderConfig(params: {
    senderKey: "ALERT" | "NOTIFICATION" | "CUSTOMER_SERVICE";
    email: string;
    name: string;
    fallbackAuthUser: string | null;
    fallbackAuthPass: string | null;
}): SenderConfig {
    const senderUserEnv = parseAuthUser(process.env[`SMTP_USER_${params.senderKey}`]);
    const senderPassEnv = parseAuthPass(process.env[`SMTP_PASS_${params.senderKey}`]);

    const hasAnyAuthConfig =
        Boolean(senderUserEnv) ||
        Boolean(senderPassEnv) ||
        Boolean(params.fallbackAuthUser) ||
        Boolean(params.fallbackAuthPass);

    if (!hasAnyAuthConfig) {
        return {
            email: params.email,
            name: params.name,
            smtpUser: null,
            smtpPass: null,
        };
    }

    const smtpUser = senderUserEnv || params.email;
    const smtpPass = senderPassEnv || params.fallbackAuthPass;

    if (!smtpPass) {
        throw new Error(
            `SMTP_PASS_${params.senderKey} atau SMTP_PASS wajib diisi untuk sender ${params.email}.`
        );
    }

    return {
        email: params.email,
        name: params.name,
        smtpUser,
        smtpPass,
    };
}

function getMailerConfig(): MailerConfig | null {
    const host = process.env.SMTP_HOST?.trim();

    if (!host) {
        return null;
    }

    const fallbackFrom = parseSenderEmail(
        process.env.SMTP_FROM,
        "notification@bikinqrisdinamis.app"
    );
    const fallbackName = parseSenderName(process.env.SMTP_FROM_NAME, "bikinqrisdinamis");

    const fallbackAuthUser = parseAuthUser(process.env.SMTP_USER);
    const fallbackAuthPass = parseAuthPass(process.env.SMTP_PASS);

    if (fallbackAuthUser && !fallbackAuthPass) {
        throw new Error("SMTP_PASS wajib diisi saat SMTP_USER dipakai.");
    }

    if (!fallbackAuthUser && fallbackAuthPass) {
        throw new Error("SMTP_USER wajib diisi saat SMTP_PASS dipakai.");
    }

    return {
        host,
        fallbackAuthUser,
        fallbackAuthPass,
        port: parsePort(process.env.SMTP_PORT),
        secure: parseBooleanEnv(process.env.SMTP_SECURE, false),
        defaultSender: {
            email: fallbackFrom,
            name: fallbackName,
            smtpUser: fallbackAuthUser,
            smtpPass: fallbackAuthPass,
        },
        senders: {
            alert: buildSenderConfig({
                senderKey: "ALERT",
                email: parseSenderEmail(process.env.SMTP_FROM_ALERT, "alert@bikinqrisdinamis.app"),
                name: parseSenderName(process.env.SMTP_FROM_ALERT_NAME, "bikinqrisdinamis Alert"),
                fallbackAuthUser,
                fallbackAuthPass,
            }),
            notification: buildSenderConfig({
                senderKey: "NOTIFICATION",
                email: parseSenderEmail(process.env.SMTP_FROM_NOTIFICATION, fallbackFrom),
                name: parseSenderName(process.env.SMTP_FROM_NOTIFICATION_NAME, fallbackName),
                fallbackAuthUser,
                fallbackAuthPass,
            }),
            customerService: buildSenderConfig({
                senderKey: "CUSTOMER_SERVICE",
                email: parseSenderEmail(
                    process.env.SMTP_FROM_CUSTOMER_SERVICE,
                    "customer-services@bikinqrisdinamis.app"
                ),
                name: parseSenderName(
                    process.env.SMTP_FROM_CUSTOMER_SERVICE_NAME,
                    "bikinqrisdinamis Customer Services"
                ),
                fallbackAuthUser,
                fallbackAuthPass,
            }),
        },
    };
}

function getFromHeader(sender: SenderConfig): string {
    const safeName = sender.name.replace(/"/g, "").trim();
    if (!safeName) {
        return sender.email;
    }

    return `"${safeName}" <${sender.email}>`;
}

function resolveSender(config: MailerConfig, senderType: SenderType): SenderConfig {
    return config.senders[senderType] ?? config.defaultSender;
}

export function isMailerConfigured(): boolean {
    return getMailerConfig() !== null;
}

function getMailerTransporter(config: MailerConfig, sender: SenderConfig): Transporter {
    const authUser = sender.smtpUser?.trim() || "";
    const cacheKey = `${config.host}|${config.port}|${config.secure ? 1 : 0}|${authUser}`;

    if (process.env.NODE_ENV !== "production") {
        const cache = globalThis.__qrisMailerTransporterByAuth ?? new Map<string, Transporter>();
        globalThis.__qrisMailerTransporterByAuth = cache;

        const cachedTransporter = cache.get(cacheKey);
        if (cachedTransporter) {
            return cachedTransporter;
        }
    }

    const auth = sender.smtpUser
        ? {
            user: sender.smtpUser,
            pass: sender.smtpPass ?? "",
        }
        : undefined;

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth,
    });

    if (process.env.NODE_ENV !== "production") {
        globalThis.__qrisMailerTransporterByAuth?.set(cacheKey, transporter);
    }

    return transporter;
}

function ensureSenderAuthMatchesFrom(sender: SenderConfig): void {
    if (!sender.smtpUser) {
        return;
    }

    const normalizedSender = sender.email.trim().toLowerCase();
    const normalizedUser = sender.smtpUser.trim().toLowerCase();

    if (normalizedSender !== normalizedUser) {
        // Allow override, but provide explicit warning for providers that enforce sender ownership.
        console.warn(
            `[MAILER] Sender ${sender.email} pakai login SMTP ${sender.smtpUser}. Pastikan provider mengizinkan send-as.`
        );
    }
}

function getMailerTransporterOrThrow(config: MailerConfig, sender: SenderConfig): Transporter {
    ensureSenderAuthMatchesFrom(sender);
    return getMailerTransporter(config, sender);
}

async function sendEmailBySender(
    senderType: SenderType,
    options: Omit<SendMailOptions, "from">
): Promise<void> {
    const config = getMailerConfig();
    if (!config) {
        throw new Error("SMTP belum dikonfigurasi. Tidak bisa kirim email.");
    }

    const sender = resolveSender(config, senderType);
    const transporter = getMailerTransporterOrThrow(config, sender);

    await transporter.sendMail({
        ...options,
        from: getFromHeader(sender),
    });
}

const EMAIL_STYLE = {
    bg: "#fffbf0",
    card: "#ffffff",
    border: "#0d0d0d",
    text: "#0d0d0d",
    muted: "#4a4a4a",
    accent: "#9fd9b4",
    danger: "#ff3b3b",
} as const;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildNeoButton(label: string, href: string): string {
    const safeLabel = escapeHtml(label);
    const safeHref = escapeHtml(href);

    return `
        <a
            href="${safeHref}"
            target="_blank"
            rel="noopener noreferrer"
            style="
                display: inline-block;
                padding: 12px 24px;
                background-color: ${EMAIL_STYLE.accent};
                color: ${EMAIL_STYLE.text};
                border: 3px solid ${EMAIL_STYLE.border};
                box-shadow: 4px 4px 0px ${EMAIL_STYLE.border};
                font-family: 'Arial Black', Arial, sans-serif;
                font-size: 14px;
                font-weight: 900;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                text-decoration: none;
            "
        >
            ${safeLabel}
        </a>
    `;
}

function baseEmailTemplate(params: { title: string; contentHtml: string }): string {
    const timestamp = new Date().toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    });

    const safeTitle = escapeHtml(params.title);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} - bikinqrisdinamis</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_STYLE.bg}; color: ${EMAIL_STYLE.text}; font-family: Inter, 'Segoe UI', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_STYLE.bg}; padding: 24px 0;">
        <tr>
            <td align="center" style="padding: 0 12px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: ${EMAIL_STYLE.card}; border: 3px solid ${EMAIL_STYLE.border}; box-shadow: 8px 8px 0px ${EMAIL_STYLE.border};">
                    <tr>
                        <td style="background-color: ${EMAIL_STYLE.accent}; border-bottom: 3px solid ${EMAIL_STYLE.border}; padding: 18px 22px;">
                            <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-size: 11px; font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                                Platform QRIS Dinamis
                            </p>
                            <h1 style="margin: 8px 0 0 0; color: ${EMAIL_STYLE.text}; font-family: 'Arial Black', Arial, sans-serif; font-size: 26px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">
                                ${safeTitle}
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 28px 24px; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLE.text};">
                            ${params.contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: ${EMAIL_STYLE.bg}; border-top: 3px solid ${EMAIL_STYLE.border}; padding: 16px 24px;">
                            <p style="margin: 0; color: ${EMAIL_STYLE.muted}; font-size: 13px; font-weight: 600;">
                                Dikirim otomatis pada <strong style="color: ${EMAIL_STYLE.text};">${escapeHtml(timestamp)}</strong>
                            </p>
                            <p style="margin: 8px 0 0 0; color: ${EMAIL_STYLE.muted}; font-size: 12px; font-weight: 500;">
                                Jika butuh bantuan, balas ke email customer service resmi bikinqrisdinamis.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

export async function sendVerificationCodeEmail(params: {
    to: string;
    name: string | null;
    code: string;
    expiresInMinutes: number;
}): Promise<void> {
    const displayName = params.name?.trim() || "Pengguna";
    const safeDisplayName = escapeHtml(displayName);
    const safeCode = escapeHtml(params.code);

    await sendEmailBySender("alert", {
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
        html: baseEmailTemplate({
            title: "Verifikasi Email",
            contentHtml: `
                <p style="margin: 0 0 12px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">Halo <strong>${safeDisplayName}</strong>,</p>
                <p style="margin: 0 0 16px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">Masukkan kode OTP berikut untuk menyelesaikan verifikasi akun.</p>

                <div style="margin: 24px 0; padding: 20px; border: 3px solid ${EMAIL_STYLE.border}; box-shadow: 6px 6px 0px ${EMAIL_STYLE.border}; background-color: ${EMAIL_STYLE.bg}; text-align: center;">
                    <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-family: 'Courier New', monospace; font-size: 42px; font-weight: 700; letter-spacing: 0.32em;">
                        ${safeCode}
                    </p>
                </div>

                <p style="margin: 0 0 10px 0; color: ${EMAIL_STYLE.text}; font-weight: 600;">
                    Kode berlaku <strong>${params.expiresInMinutes} menit</strong>.
                </p>
                <p style="margin: 0; color: ${EMAIL_STYLE.muted}; font-size: 14px; font-weight: 500;">
                    Demi keamanan, jangan bagikan kode ini ke siapa pun.
                </p>
            `,
        }),
    });
}

export async function sendUserNotificationEmail(params: {
    to: string;
    subject: string;
    textLines: string[];
    html: string;
}): Promise<void> {
    await sendEmailBySender("notification", {
        to: params.to,
        subject: params.subject,
        text: params.textLines.join("\n"),
        html: params.html,
    });
}

export async function sendAccountCreatedNotificationEmail(params: {
    to: string;
    name: string | null;
}): Promise<void> {
    const displayName = params.name?.trim() || "Pengguna";
    const safeDisplayName = escapeHtml(displayName);
    const appBaseUrl =
        (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://bikinqrisdinamis.app").replace(
            /\/+$/,
            ""
        );
    const signInUrl = `${appBaseUrl}/sign-in`;

    await sendUserNotificationEmail({
        to: params.to,
        subject: "Akun bikinqrisdinamis berhasil dibuat",
        textLines: [
            `Halo ${displayName},`,
            "",
            "Akun kamu berhasil dibuat.",
            "Silakan lanjutkan verifikasi email agar bisa login.",
        ],
        html: baseEmailTemplate({
            title: "Akun Berhasil Dibuat",
            contentHtml: `
                <style>
                    @keyframes neo-pop {
                        0% { transform: scale(0.88) rotate(-2deg); opacity: 0; }
                        60% { transform: scale(1.04) rotate(1deg); opacity: 1; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                </style>

                <div style="margin: 0 0 20px 0; padding: 18px 16px; border: 3px solid ${EMAIL_STYLE.border}; box-shadow: 6px 6px 0px ${EMAIL_STYLE.border}; background-color: ${EMAIL_STYLE.accent}; text-align: center; animation: neo-pop 700ms ease-out;">
                    <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-family: 'Arial Black', Arial, sans-serif; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em;">
                        Akun Kamu Siap Dipakai
                    </p>
                </div>

                <p style="margin: 0 0 12px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">Halo <strong>${safeDisplayName}</strong>,</p>
                <p style="margin: 0 0 16px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">
                    Registrasi berhasil. Lanjutkan verifikasi email agar kamu bisa masuk dan mulai membuat QRIS dinamis.
                </p>

                <div style="margin: 22px 0 0 0; text-align: center;">
                    ${buildNeoButton("Masuk ke Dashboard", signInUrl)}
                </div>
            `,
        }),
    });
}

export async function sendPasswordResetInstructionEmail(params: {
    to: string;
    name: string | null;
    resetUrl: string;
    expiresInMinutes: number;
}): Promise<void> {
    const displayName = params.name?.trim() || "Pengguna";
    const safeDisplayName = escapeHtml(displayName);

    await sendUserNotificationEmail({
        to: params.to,
        subject: "Instruksi reset password bikinqrisdinamis",
        textLines: [
            `Halo ${displayName},`,
            "",
            "Kami menerima permintaan reset password akun kamu.",
            `Buka link berikut untuk set password baru (${params.expiresInMinutes} menit):`,
            params.resetUrl,
            "",
            "Jika kamu tidak meminta reset password, abaikan email ini.",
        ],
        html: baseEmailTemplate({
            title: "Reset Password",
            contentHtml: `
                <p style="margin: 0 0 12px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">Halo <strong>${safeDisplayName}</strong>,</p>
                <p style="margin: 0 0 16px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">Kami menerima permintaan reset password akun kamu.</p>

                <div style="margin: 22px 0; padding: 16px; border: 3px solid ${EMAIL_STYLE.border}; box-shadow: 4px 4px 0px ${EMAIL_STYLE.border}; background-color: ${EMAIL_STYLE.bg};">
                    <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-size: 15px; font-weight: 600; text-align: center;">
                        Link reset berlaku <strong style="color: ${EMAIL_STYLE.danger};">${params.expiresInMinutes} menit</strong>.
                    </p>
                </div>

                <div style="margin: 0 0 12px 0; text-align: center;">
                    ${buildNeoButton("Reset Password Sekarang", params.resetUrl)}
                </div>

                <p style="margin: 0; color: ${EMAIL_STYLE.muted}; font-size: 14px; font-weight: 500;">
                    Jika kamu tidak meminta reset password, abaikan email ini.
                </p>
            `,
        }),
    });
}

export async function sendPasswordResetSuccessEmail(params: {
    to: string;
    name: string | null;
}): Promise<void> {
    const displayName = params.name?.trim() || "Pengguna";
    const safeDisplayName = escapeHtml(displayName);

    await sendUserNotificationEmail({
        to: params.to,
        subject: "Password bikinqrisdinamis berhasil diubah",
        textLines: [
            `Halo ${displayName},`,
            "",
            "Password akun kamu berhasil diubah.",
            "Jika ini bukan kamu, segera hubungi customer service kami.",
        ],
        html: baseEmailTemplate({
            title: "Password Berhasil Diubah",
            contentHtml: `
                <p style="margin: 0 0 12px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">Halo <strong>${safeDisplayName}</strong>,</p>

                <div style="margin: 20px 0; padding: 18px; border: 3px solid ${EMAIL_STYLE.border}; box-shadow: 4px 4px 0px ${EMAIL_STYLE.border}; background-color: ${EMAIL_STYLE.accent};">
                    <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-size: 16px; font-weight: 700; text-align: center;">
                        Password akun kamu berhasil diperbarui.
                    </p>
                </div>

                <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">
                    Jika perubahan ini bukan dari kamu, segera hubungi customer service agar akun bisa diamankan.
                </p>
            `,
        }),
    });
}

export async function sendNewDeviceLoginAlertEmail(params: {
    to: string;
    name: string | null;
    browser: string;
    osFamily: string;
    deviceType: string;
    ipAddress: string;
    loginAt: Date;
}): Promise<void> {
    const displayName = params.name?.trim() || "Pengguna";
    const safeDisplayName = escapeHtml(displayName);
    const safeBrowser = escapeHtml(params.browser);
    const safeOsFamily = escapeHtml(params.osFamily);
    const safeDeviceType = escapeHtml(params.deviceType);
    const safeIpAddress = escapeHtml(params.ipAddress);
    const formattedLoginAt = params.loginAt.toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
        timeZoneName: "short",
    });
    const safeFormattedLoginAt = escapeHtml(formattedLoginAt);
    const appBaseUrl = (
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        "https://bikinqrisdinamis.app"
    ).replace(/\/+$/, "");
    const resetPasswordUrl = `${appBaseUrl}/forgot-password`;

    await sendEmailBySender("alert", {
        to: params.to,
        subject: "Login baru terdeteksi di akun bikinqrisdinamis",
        text: [
            `Halo ${displayName},`,
            "",
            "Kami mendeteksi login dari device baru di akun kamu.",
            `Browser: ${params.browser}`,
            `Sistem Operasi: ${params.osFamily}`,
            `Tipe Device: ${params.deviceType}`,
            `Alamat IP: ${params.ipAddress}`,
            `Waktu Login: ${formattedLoginAt}`,
            "",
            "Jika ini bukan kamu, segera ubah password akun untuk mengamankan akses.",
            resetPasswordUrl,
        ].join("\n"),
        html: baseEmailTemplate({
            title: "Login Device Baru",
            contentHtml: `
                <p style="margin: 0 0 12px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">Halo <strong>${safeDisplayName}</strong>,</p>
                <p style="margin: 0 0 16px 0; color: ${EMAIL_STYLE.text}; font-weight: 500;">
                    Kami mendeteksi login dari device atau browser yang belum pernah dipakai sebelumnya.
                </p>

                <div style="margin: 20px 0; padding: 16px; border: 3px solid ${EMAIL_STYLE.border}; box-shadow: 4px 4px 0px ${EMAIL_STYLE.border}; background-color: ${EMAIL_STYLE.bg};">
                    <p style="margin: 0 0 8px 0; color: ${EMAIL_STYLE.text}; font-weight: 700;">Browser: <span style="font-weight: 500;">${safeBrowser}</span></p>
                    <p style="margin: 0 0 8px 0; color: ${EMAIL_STYLE.text}; font-weight: 700;">Sistem Operasi: <span style="font-weight: 500;">${safeOsFamily}</span></p>
                    <p style="margin: 0 0 8px 0; color: ${EMAIL_STYLE.text}; font-weight: 700;">Tipe Device: <span style="font-weight: 500;">${safeDeviceType}</span></p>
                    <p style="margin: 0 0 8px 0; color: ${EMAIL_STYLE.text}; font-weight: 700;">Alamat IP: <span style="font-weight: 500;">${safeIpAddress}</span></p>
                    <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-weight: 700;">Waktu Login: <span style="font-weight: 500;">${safeFormattedLoginAt}</span></p>
                </div>

                <div style="margin: 0 0 14px 0; padding: 14px; border: 3px solid ${EMAIL_STYLE.border}; box-shadow: 4px 4px 0px ${EMAIL_STYLE.border}; background-color: ${EMAIL_STYLE.accent};">
                    <p style="margin: 0; color: ${EMAIL_STYLE.text}; font-weight: 700; text-align: center;">
                        Jika ini bukan kamu, segera reset password untuk amankan akun.
                    </p>
                </div>

                <div style="margin: 0; text-align: center;">
                    ${buildNeoButton("Reset Password", resetPasswordUrl)}
                </div>
            `,
        }),
    });
}

export async function sendCustomerServiceMessageEmail(params: {
    to: string;
    subject: string;
    textLines: string[];
    html: string;
    replyTo?: string;
    attachments?: SendMailOptions["attachments"];
}): Promise<void> {
    await sendEmailBySender("customerService", {
        to: params.to,
        subject: params.subject,
        text: params.textLines.join("\n"),
        html: params.html,
        replyTo: params.replyTo,
        attachments: params.attachments,
    });
}