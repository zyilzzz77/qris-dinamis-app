import { auth } from "@/lib/auth";
import { logApiRequest } from "@/lib/api-request-log";
import {
    isValidEmailAddress,
    normalizeEmailAddress,
} from "@/lib/email-verification";
import {
    isMailerConfigured,
    sendCustomerServiceMessageEmail,
    sendUserNotificationEmail,
} from "@/lib/mailer";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { toAbsoluteUrlFromRequest } from "@/lib/seo";
import { sanitizeFilename, saveFile } from "@/lib/storage";
import {
    cleanupExpiredSupportEvidenceForUser,
    getSupportEvidenceRetentionDays,
} from "@/lib/support-evidence-retention";

const MAX_SUPPORT_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_SUPPORT_ATTACHMENT_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
]);

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, { status, headers });
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function sanitizeSingleLineText(raw: string, maxLength: number): string {
    return String(raw).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function resolveCustomerServiceInboxEmail(): string | null {
    const configuredEmail = normalizeEmailAddress(
        String(
            process.env.CUSTOMER_SERVICE_INBOX_EMAIL ??
            process.env.SMTP_FROM_CUSTOMER_SERVICE ??
            ""
        )
    );

    if (!configuredEmail || !isValidEmailAddress(configuredEmail)) {
        return null;
    }

    return configuredEmail;
}

function resolveOwnerEmail(): string {
    const ownerEmail = normalizeEmailAddress(
        String(process.env.SUPPORT_OWNER_EMAIL ?? "enzilaja@gmail.com")
    );

    if (isValidEmailAddress(ownerEmail)) {
        return ownerEmail;
    }

    return "enzilaja@gmail.com";
}

function isAllowedAttachmentType(file: File): boolean {
    const mimeType = file.type.toLowerCase();

    if (!mimeType) {
        return false;
    }

    return ALLOWED_SUPPORT_ATTACHMENT_TYPES.has(mimeType);
}

function getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
        case "image/png":
            return "png";
        case "image/jpeg":
        case "image/jpg":
            return "jpg";
        case "image/webp":
            return "webp";
        case "image/gif":
            return "gif";
        case "image/bmp":
            return "bmp";
        case "image/tiff":
            return "tiff";
        case "video/mp4":
            return "mp4";
        case "video/webm":
            return "webm";
        case "video/quicktime":
            return "mov";
        case "video/x-msvideo":
            return "avi";
        default:
            return "bin";
    }
}

function resolveEvidenceFilename(file: File): string {
    const rawName = sanitizeFilename(String(file.name ?? "").trim());
    if (rawName) {
        return `${Date.now()}-${rawName}`;
    }

    const ext = getExtensionFromMime(file.type.toLowerCase());
    return `support-evidence-${Date.now()}.${ext}`;
}

function buildGmailComposeUrl(params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
}): string {
    const searchParams = new URLSearchParams({
        view: "cm",
        fs: "1",
        to: params.to,
        su: params.subject,
        body: params.body,
    });

    if (params.cc) {
        searchParams.set("cc", params.cc);
    }

    return `https://mail.google.com/mail/?${searchParams.toString()}`;
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const rateLimit = checkRateLimit(request, {
            keyPrefix: "dashboard-support-request",
            windowMs: 60_000,
            maxRequests: 8,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak request support. Coba lagi beberapa saat.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        await logApiRequest({
            request,
            endpoint: "/api/support",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                {
                    success: false,
                    error: "Kamu harus login dulu untuk mengirim support ticket.",
                },
                401
            );
        }

        const customerServiceInboxEmail = resolveCustomerServiceInboxEmail();
        if (!customerServiceInboxEmail) {
            return jsonResponse(
                {
                    success: false,
                    error: "Email customer service belum dikonfigurasi dengan benar.",
                },
                500
            );
        }

        const ownerEmail = resolveOwnerEmail();

        const cleanedCount = await cleanupExpiredSupportEvidenceForUser(userId);

        const formData = await request.formData();
        const sessionEmail = normalizeEmailAddress(String(session.user?.email ?? ""));
        const submittedEmail = normalizeEmailAddress(String(formData.get("email") ?? ""));
        const senderEmail = sessionEmail || submittedEmail;

        if (!senderEmail || !isValidEmailAddress(senderEmail)) {
            return jsonResponse(
                {
                    success: false,
                    error: "Email user tidak valid.",
                },
                400
            );
        }

        const supportTopic =
            sanitizeSingleLineText(String(formData.get("topic") ?? ""), 100) ||
            "Kendala aplikasi QRIS dinamis";

        const supportMessage = String(formData.get("message") ?? "").trim().slice(0, 5000);

        if (supportMessage.length < 20) {
            return jsonResponse(
                {
                    success: false,
                    error: "Pesan kendala minimal 20 karakter.",
                },
                400
            );
        }

        const evidence = formData.get("evidence");
        if (!(evidence instanceof File)) {
            return jsonResponse(
                {
                    success: false,
                    error: "Lampiran bukti photo/video wajib diunggah.",
                },
                400
            );
        }

        if (evidence.size <= 0) {
            return jsonResponse(
                {
                    success: false,
                    error: "File lampiran kosong dan tidak bisa diproses.",
                },
                400
            );
        }

        if (evidence.size > MAX_SUPPORT_ATTACHMENT_SIZE_BYTES) {
            return jsonResponse(
                {
                    success: false,
                    error: "Ukuran lampiran maksimal 20MB.",
                },
                413
            );
        }

        if (!isAllowedAttachmentType(evidence)) {
            return jsonResponse(
                {
                    success: false,
                    error: "Format lampiran harus berupa foto atau video yang didukung.",
                },
                400
            );
        }

        const evidenceBuffer = Buffer.from(await evidence.arrayBuffer());
        const evidenceFilename = resolveEvidenceFilename(evidence);

        await saveFile(`buktilaporan/${userId}`, evidenceFilename, evidenceBuffer);

        const evidencePathAlias =
            `/buktilaporan/${encodeURIComponent(userId)}/${encodeURIComponent(evidenceFilename)}`;
        const evidencePublicUrl = toAbsoluteUrlFromRequest(evidencePathAlias, request);

        const submittedAt = new Date();
        const submittedAtText = submittedAt.toLocaleString("id-ID", {
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
        const displayName = sanitizeSingleLineText(
            String(session.user?.name ?? "Pengguna Dashboard"),
            80
        );

        const issuePreview = sanitizeSingleLineText(supportMessage, 90);
        const gmailSubject =
            `[Support Ticket] ${supportTopic} | ${issuePreview}`.slice(0, 180);

        const gmailBody = [
            "Halo Tim Customer Service bikinqrisdinamis,",
            "",
            "Saya ingin melaporkan kendala berikut:",
            `Nama: ${displayName}`,
            `Email: ${senderEmail}`,
            `User ID: ${userId}`,
            `Waktu: ${submittedAtText}`,
            `Topik: ${supportTopic}`,
            "",
            "Permasalahan:",
            supportMessage,
            "",
            `Link Bukti Photo/Video: ${evidencePublicUrl}`,
            "",
            "Terima kasih.",
        ].join("\n");

        const gmailComposeUrl = buildGmailComposeUrl({
            to: customerServiceInboxEmail,
            cc: ownerEmail,
            subject: gmailSubject,
            body: gmailBody,
        });

        const mailWarnings: string[] = [];

        if (cleanedCount > 0) {
            mailWarnings.push(
                `${cleanedCount} link bukti laporan lama (> ${getSupportEvidenceRetentionDays()} hari) sudah dihapus otomatis.`
            );
        }

        if (!isMailerConfigured()) {
            mailWarnings.push("SMTP belum aktif. Auto-reply dan owner copy tidak terkirim.");
        } else {
            const mailResults = await Promise.allSettled([
                sendUserNotificationEmail({
                    to: senderEmail,
                    subject: "Laporan support sudah diterima - bikinqrisdinamis",
                    textLines: [
                        `Halo ${displayName},`,
                        "",
                        "Laporan kendala kamu sudah kami terima.",
                        `Topik: ${supportTopic}`,
                        `Waktu diterima: ${submittedAtText}`,
                        `Link bukti: ${evidencePublicUrl}`,
                        "",
                        "Tim kami akan segera menindaklanjuti laporan kamu.",
                    ],
                    html: `
                        <div style="font-family: Inter, Arial, sans-serif; color: #111111; line-height: 1.6;">
                            <h2 style="margin: 0 0 12px 0;">Laporan Support Diterima</h2>
                            <p style="margin: 0 0 8px 0;">Halo <strong>${escapeHtml(displayName)}</strong>,</p>
                            <p style="margin: 0 0 14px 0;">Laporan kendala kamu sudah kami terima dan sedang diproses.</p>
                            <p style="margin: 0 0 6px 0;"><strong>Topik:</strong> ${escapeHtml(supportTopic)}</p>
                            <p style="margin: 0 0 6px 0;"><strong>Waktu Diterima:</strong> ${escapeHtml(submittedAtText)}</p>
                            <p style="margin: 0 0 14px 0;"><strong>Link Bukti:</strong> <a href="${escapeHtml(evidencePublicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(evidencePublicUrl)}</a></p>
                            <p style="margin: 0;">Terima kasih sudah menghubungi tim bikinqrisdinamis.</p>
                        </div>
                    `,
                }),
                sendCustomerServiceMessageEmail({
                    to: ownerEmail,
                    subject: `[Owner Copy] ${gmailSubject}`.slice(0, 190),
                    replyTo: senderEmail,
                    textLines: [
                        "Halo Owner bikinqrisdinamis,",
                        "",
                        "Ada laporan support baru.",
                        `Nama User: ${displayName}`,
                        `Email User: ${senderEmail}`,
                        `User ID: ${userId}`,
                        `Waktu: ${submittedAtText}`,
                        `Topik: ${supportTopic}`,
                        "",
                        "Permasalahan:",
                        supportMessage,
                        "",
                        `Link Bukti Photo/Video: ${evidencePublicUrl}`,
                    ],
                    html: `
                        <div style="font-family: Inter, Arial, sans-serif; color: #111111; line-height: 1.6;">
                            <h2 style="margin: 0 0 12px 0;">Owner Copy - Support Ticket</h2>
                            <p style="margin: 0 0 8px 0;"><strong>Nama User:</strong> ${escapeHtml(displayName)}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Email User:</strong> ${escapeHtml(senderEmail)}</p>
                            <p style="margin: 0 0 8px 0;"><strong>User ID:</strong> ${escapeHtml(userId)}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Topik:</strong> ${escapeHtml(supportTopic)}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Waktu:</strong> ${escapeHtml(submittedAtText)}</p>
                            <p style="margin: 0 0 14px 0;"><strong>Link Bukti:</strong> <a href="${escapeHtml(evidencePublicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(evidencePublicUrl)}</a></p>
                            <p style="margin: 0 0 6px 0;"><strong>Permasalahan:</strong></p>
                            <div style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; white-space: pre-wrap;">${escapeHtml(supportMessage)}</div>
                        </div>
                    `,
                }),
            ]);

            if (mailResults[0].status === "rejected") {
                console.error("[SUPPORT_AUTO_REPLY_ERROR]", mailResults[0].reason);
                mailWarnings.push("Auto-reply ke user gagal terkirim.");
            }

            if (mailResults[1].status === "rejected") {
                console.error("[SUPPORT_OWNER_COPY_ERROR]", mailResults[1].reason);
                mailWarnings.push("Email copy ke owner gagal terkirim.");
            }
        }

        return jsonResponse({
            success: true,
            message:
                "Draft Gmail siap dibuka. Link bukti CDN sudah dibuat, auto-reply user dan owner copy diproses otomatis.",
            data: {
                gmailComposeUrl,
                evidencePublicUrl,
                supportRecipientEmail: customerServiceInboxEmail,
                ownerRecipientEmail: ownerEmail,
            },
            warnings: mailWarnings,
        });
    } catch (error) {
        console.error("[SUPPORT_REQUEST]", error);
        return jsonResponse(
            {
                success: false,
                error: "Terjadi kesalahan saat menyiapkan laporan support.",
            },
            500
        );
    }
}
