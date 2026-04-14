"use client";

import { FormEvent, useMemo, useState } from "react";
import { Mail, Paperclip, ShieldCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type SupportClientPageProps = {
    defaultEmail: string;
    defaultName: string | null;
    supportRecipientEmail: string;
};

type SupportApiResponse = {
    success?: boolean;
    message?: string;
    error?: string;
    data?: {
        gmailComposeUrl?: string;
        evidencePublicUrl?: string;
        supportRecipientEmail?: string;
        ownerRecipientEmail?: string;
    };
    warnings?: string[];
};

const MAX_EVIDENCE_SIZE_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export default function SupportClientPage(props: SupportClientPageProps) {
    const [email, setEmail] = useState(props.defaultEmail);
    const [topic, setTopic] = useState("Kendala transaksi QRIS");
    const [message, setMessage] = useState("");
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [evidencePublicUrl, setEvidencePublicUrl] = useState("");

    function sanitizeSingleLineText(raw: string, maxLength: number): string {
        return raw.replace(/\s+/g, " ").trim().slice(0, maxLength);
    }

    const evidenceMeta = useMemo(() => {
        if (!evidenceFile) {
            return null;
        }

        return {
            name: evidenceFile.name,
            size: formatBytes(evidenceFile.size),
            type: evidenceFile.type || "unknown",
        };
    }, [evidenceFile]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (loading) {
            return;
        }

        setError("");
        setSuccess("");
        setEvidencePublicUrl("");

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedTopic = sanitizeSingleLineText(topic, 100);
        const normalizedMessage = message.trim();

        if (!normalizedEmail) {
            setError("Email user wajib diisi.");
            return;
        }

        if (!normalizedTopic) {
            setError("Subjek kendala wajib diisi.");
            return;
        }

        if (normalizedMessage.length < 20) {
            setError("Pesan kendala minimal 20 karakter.");
            return;
        }

        if (!evidenceFile) {
            setError("Lampiran bukti foto/video wajib diunggah.");
            return;
        }

        if (evidenceFile.size > MAX_EVIDENCE_SIZE_BYTES) {
            setError("Ukuran lampiran maksimal 20MB.");
            return;
        }

        setLoading(true);
        let composeWindow: Window | null = null;

        try {
            // Open one tab immediately in direct user gesture to avoid popup blocking
            // and prevent double-open behavior from open+fallback patterns.
            composeWindow = window.open("", "_blank");

            const formData = new FormData();
            formData.append("email", normalizedEmail);
            formData.append("topic", normalizedTopic);
            formData.append("message", normalizedMessage);
            formData.append("evidence", evidenceFile);

            const response = await fetch("/api/support", {
                method: "POST",
                body: formData,
            });

            let data: SupportApiResponse | null = null;
            try {
                data = (await response.json()) as SupportApiResponse;
            } catch {
                data = null;
            }

            if (!response.ok) {
                if (composeWindow && !composeWindow.closed) {
                    composeWindow.close();
                }
                setError(data?.error || "Gagal menyiapkan draft Gmail support.");
                return;
            }

            const gmailComposeUrl = data?.data?.gmailComposeUrl;
            const uploadedEvidenceUrl = data?.data?.evidencePublicUrl;

            if (!gmailComposeUrl) {
                if (composeWindow && !composeWindow.closed) {
                    composeWindow.close();
                }
                setError("Draft Gmail tidak tersedia. Coba lagi beberapa saat.");
                return;
            }

            if (uploadedEvidenceUrl) {
                setEvidencePublicUrl(uploadedEvidenceUrl);
            }

            if (composeWindow && !composeWindow.closed) {
                try {
                    composeWindow.opener = null;
                } catch {
                    // ignore cross-browser opener assignment issues
                }
                composeWindow.location.href = gmailComposeUrl;
            } else {
                window.location.href = gmailComposeUrl;
            }

            const warningText = data?.warnings?.length
                ? ` Catatan: ${data.warnings.join(" ")}`
                : "";

            setSuccess(
                `${data?.message || "Draft Gmail support berhasil dibuka."} Bukti photo/video sudah jadi link CDN.${warningText}`
            );
        } catch {
            if (composeWindow && !composeWindow.closed) {
                composeWindow.close();
            }
            setError("Gagal membuka Gmail compose. Pastikan popup browser tidak diblokir.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 lg:pb-0 space-y-6">
            <header>
                <h1 className="font-heading text-3xl lg:text-4xl text-nb-black">Support</h1>
                <p className="font-sans text-sm text-nb-gray mt-2">
                    Kirim kendala kamu langsung ke tim customer service beserta bukti foto/video.
                </p>
            </header>

            <section className="grid gap-4 lg:grid-cols-3">
                <article className="card-nb p-5 space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2">
                        <Mail size={18} className="text-nb-black" />
                        <h2 className="font-heading text-xl text-nb-black">Mail User</h2>
                    </div>

                    <div
                        className="p-3"
                        style={{
                            border: "2px solid #0D0D0D",
                            backgroundColor: "#FFFBF0",
                        }}
                    >
                        <p className="font-mono text-xs text-nb-gray font-bold">Pengirim</p>
                        <p className="font-mono text-sm font-bold text-nb-black break-all mt-1">
                            {email || "(email belum diisi)"}
                        </p>
                        <p className="font-mono text-xs text-nb-gray mt-2">
                            {props.defaultName || "User Dashboard"}
                        </p>
                    </div>

                    <div
                        className="p-3"
                        style={{
                            border: "2px solid #0D0D0D",
                            backgroundColor: "#9FD9B4",
                        }}
                    >
                        <p className="font-mono text-xs font-bold text-nb-black">
                            Saat klik kirim, file bukti diupload jadi link CDN lalu Gmail kamu
                            dibuka otomatis dengan detail laporan siap kirim.
                        </p>
                        <p className="font-mono text-xs text-nb-black mt-2 break-all">
                            Tujuan: {props.supportRecipientEmail}
                        </p>
                    </div>
                </article>

                <article className="card-nb p-5 lg:col-span-2">
                    {success && (
                        <div
                            className="mb-4 p-3 font-mono text-sm font-bold text-nb-black"
                            style={{
                                backgroundColor: "#9FD9B4",
                                border: "2px solid #0D0D0D",
                            }}
                        >
                            {success}
                        </div>
                    )}

                    {error && (
                        <div
                            className="mb-4 p-3 font-mono text-sm font-bold text-white"
                            style={{
                                backgroundColor: "#FF3B3B",
                                border: "2px solid #0D0D0D",
                            }}
                        >
                            ⚠ {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <Input
                            id="support-email"
                            type="email"
                            label="Email User"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                        />

                        <Input
                            id="support-topic"
                            type="text"
                            label="Subjek Kendala"
                            value={topic}
                            onChange={(event) => setTopic(event.target.value)}
                            maxLength={100}
                            required
                        />

                        <div className="flex flex-col gap-1.5 w-full">
                            <label
                                htmlFor="support-message"
                                className="font-mono text-sm font-bold text-nb-black"
                            >
                                Pesan Kendala
                            </label>
                            <textarea
                                id="support-message"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                className="input-nb min-h-[150px] resize-y"
                                placeholder="Jelaskan kendala secara detail: langkah kejadian, waktu, dan dampaknya."
                                minLength={20}
                                maxLength={5000}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <label
                                htmlFor="support-evidence"
                                className="font-mono text-sm font-bold text-nb-black"
                            >
                                Bukti Photo/Video
                            </label>
                            <input
                                id="support-evidence"
                                type="file"
                                accept="image/*,video/*"
                                onChange={(event) => {
                                    const selectedFile = event.target.files?.[0] ?? null;
                                    setEvidenceFile(selectedFile);
                                }}
                                className="input-nb file:mr-3 file:font-mono file:text-xs file:font-bold file:border-0 file:bg-nb-yellow file:px-3 file:py-2"
                                required
                            />
                            <p className="font-mono text-xs text-nb-gray">
                                Format: image/video. Maksimal 20MB. Setelah upload, sistem
                                membuat link CDN bukti yang otomatis masuk ke draft Gmail.
                            </p>
                        </div>

                        {evidencePublicUrl && (
                            <div
                                className="p-3"
                                style={{
                                    border: "2px solid #0D0D0D",
                                    backgroundColor: "#9FD9B4",
                                }}
                            >
                                <p className="font-mono text-xs font-bold text-nb-black">
                                    Link CDN bukti laporan:
                                </p>
                                <a
                                    href={evidencePublicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-nb-black underline break-all"
                                >
                                    {evidencePublicUrl}
                                </a>
                            </div>
                        )}

                        {evidenceMeta && (
                            <div
                                className="p-3"
                                style={{
                                    border: "2px solid #0D0D0D",
                                    backgroundColor: "#FFFBF0",
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Paperclip size={16} className="text-nb-black" />
                                    <p className="font-mono text-xs font-bold text-nb-black">
                                        Lampiran terpilih
                                    </p>
                                </div>
                                <p className="font-mono text-xs text-nb-gray break-all">
                                    Nama: {evidenceMeta.name}
                                </p>
                                <p className="font-mono text-xs text-nb-gray">
                                    Tipe: {evidenceMeta.type}
                                </p>
                                <p className="font-mono text-xs text-nb-gray">
                                    Ukuran: {evidenceMeta.size}
                                </p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="black"
                            className="w-full"
                            size="lg"
                            loading={loading}
                            icon={<ShieldCheck size={18} />}
                            id="support-send-button"
                        >
                            Buka Gmail untuk Kirim
                        </Button>
                    </form>
                </article>
            </section>
        </div>
    );
}