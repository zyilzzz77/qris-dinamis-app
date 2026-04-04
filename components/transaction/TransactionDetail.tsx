"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import type { Transaction, TransactionStatus } from "@/types";
import { Copy, Send, Share2 } from "lucide-react";

interface TransactionDetailProps {
  transaction: Transaction & {
    qrisStatic?: {
      merchantName: string;
      merchantCity: string;
      nmid: string;
    };
  };
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error;
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    // Ignore parse errors and use fallback message.
  }

  return fallback;
}

export default function TransactionDetail({ transaction: tx }: TransactionDetailProps) {
  const router = useRouter();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const sharePath = `/${encodeURIComponent(tx.userId)}/${encodeURIComponent(tx.id)}`;
  const shareUrl = origin ? `${origin}${sharePath}` : "";
  const shareText = `Pembayaran ${formatCurrency(tx.totalAmount)} ke ${tx.qrisStatic?.merchantName || "merchant"}`;
  const combinedShareText = `${shareText} ${shareUrl}`.trim();
  const whatsappShareUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(combinedShareText)}`
    : "#";
  const telegramShareUrl = shareUrl
    ? `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    : "#";
  const xShareUrl = shareUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    : "#";

  async function handleConfirm() {
    setError("");
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/transaction/${tx.id}/confirm`, {
        method: "POST",
      });

      if (res.ok) {
        setConfirmModalOpen(false);
        router.refresh();
        return;
      }

      setError(await readErrorMessage(res, "Gagal konfirmasi transaksi."));
    } catch {
      setError("Gagal konfirmasi.");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleProofUpload() {
    if (!proofFile) return;

    setError("");
    setInfo("");
    setProofLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", proofFile);
      const res = await fetch(`/api/transaction/${tx.id}/proof`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setProofModalOpen(false);
        router.refresh();
        return;
      }

      setError(await readErrorMessage(res, "Gagal upload bukti transfer."));
    } catch {
      setError("Gagal upload bukti.");
    } finally {
      setProofLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setProofFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleCopyShareLink() {
    if (!shareUrl) {
      setError("Link share belum siap. Coba lagi sebentar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setError("");
      setInfo("Link QRIS berhasil disalin.");
    } catch {
      setError("Gagal menyalin link QRIS.");
    }
  }

  async function handleNativeShare() {
    if (!shareUrl) {
      setError("Link share belum siap. Coba lagi sebentar.");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "QRIS Dinamis",
          text: shareText,
          url: shareUrl,
        });
        setError("");
        setInfo("QRIS berhasil dibagikan.");
        return;
      } catch {
        // Ignore if user cancels share dialog.
      }
    }

    await handleCopyShareLink();
  }

  const status = tx.status as TransactionStatus;
  const canConfirm = status === "PENDING" || status === "WAITING_PROOF";
  const canUploadProof = status === "PENDING";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Back */}
      <Link href="/history">
        <Button variant="ghost" size="sm">
          ← Kembali ke Riwayat
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl text-nb-black">
            Transaksi #{tx.id.slice(-6).toUpperCase()}
          </h1>
          <p className="font-mono text-xs text-nb-gray mt-1 font-bold">
            {formatDate(tx.createdAt)}
          </p>
        </div>
        <Badge status={status} className="text-base px-4 py-2" />
      </div>

      {/* QR Code + Info */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* QR Code */}
        {tx.qrisImageUrl && (
          <div className="card-nb p-5 flex flex-col items-center gap-4">
            <h3 className="font-heading text-lg text-nb-black self-start">
              QR Code
            </h3>
            <div
              className="border-2 border-nb-black p-3 bg-nb-bg"
              style={{ boxShadow: "4px 4px 0px #0D0D0D" }}
            >
              <Image
                src={tx.qrisImageUrl}
                alt="QRIS Dinamis"
                width={200}
                height={200}
              />
            </div>
            <Button
              variant="white"
              size="sm"
              className="w-full"
              onClick={async () => {
                const res = await fetch(tx.qrisImageUrl!);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `qris-${tx.id.slice(-6)}.png`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              ⬇ Download QR
            </Button>

            <div className="w-full border-t-2 border-nb-black pt-3">
              <p className="font-mono text-xs font-bold text-nb-gray uppercase tracking-wider mb-2">
                Share QRIS Dinamis
              </p>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-nb btn-nb-white text-xs py-2 ${!shareUrl ? "pointer-events-none opacity-50" : ""}`}
                >
                  WhatsApp
                </a>
                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-nb btn-nb-white text-xs py-2 ${!shareUrl ? "pointer-events-none opacity-50" : ""}`}
                >
                  Telegram
                </a>
                <a
                  href={xShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-nb btn-nb-white text-xs py-2 ${!shareUrl ? "pointer-events-none opacity-50" : ""}`}
                >
                  X / Twitter
                </a>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="btn-nb btn-nb-black text-xs py-2"
                  disabled={!shareUrl}
                >
                  <Copy size={14} />
                  Copy Link
                </button>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full mt-2"
                icon={<Share2 size={14} />}
                onClick={handleNativeShare}
                disabled={!shareUrl}
              >
                Share dari Browser
              </Button>

              {shareUrl && (
                <p className="font-mono text-[11px] text-nb-gray mt-2 break-all">
                  <Send size={12} className="inline-block mr-1" />
                  {shareUrl}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="card-nb p-5 space-y-4">
          <h3 className="font-heading text-lg text-nb-black">Detail Transaksi</h3>
          <dl className="space-y-3 font-mono text-sm">
            <div>
              <dt className="text-nb-gray text-xs font-bold uppercase tracking-wider">
                Merchant
              </dt>
              <dd className="text-nb-black font-bold mt-0.5">
                {tx.qrisStatic?.merchantName || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-nb-gray text-xs font-bold uppercase tracking-wider">
                Kota
              </dt>
              <dd className="text-nb-black mt-0.5">
                {tx.qrisStatic?.merchantCity || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-nb-gray text-xs font-bold uppercase tracking-wider">
                Deskripsi
              </dt>
              <dd className="text-nb-black mt-0.5">
                {tx.description || "-"}
              </dd>
            </div>
            <div className="border-t-2 border-nb-black pt-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-nb-gray">Nominal</span>
                <span>{formatCurrency(tx.baseAmount)}</span>
              </div>
              {tx.taxAmount > 0 && (
                <div className="flex justify-between text-nb-orange">
                  <span>Pajak ({tx.taxType})</span>
                  <span>+{formatCurrency(tx.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-nb-black text-base border-t-2 border-nb-black pt-2">
                <span>TOTAL</span>
                <span>{formatCurrency(tx.totalAmount)}</span>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Proof of payment */}
      {tx.proofImageUrl && (
        <div className="card-nb p-5">
          <h3 className="font-heading text-lg text-nb-black mb-4">
            Bukti Transfer
          </h3>
          <Image
            src={tx.proofImageUrl}
            alt="Bukti Transfer"
            width={400}
            height={300}
            className="border-2 border-nb-black"
            style={{ objectFit: "contain", maxHeight: 300 }}
          />
        </div>
      )}

      {/* Actions */}
      {(canConfirm || canUploadProof) && (
        <div className="flex flex-wrap gap-3">
          {canUploadProof && (
            <Button
              variant="primary"
              onClick={() => {
                setError("");
                setProofModalOpen(true);
              }}
              id="upload-proof-btn"
            >
              📷 Upload Bukti Transfer
            </Button>
          )}
          {canConfirm && (
            <Button
              variant="green"
              onClick={() => {
                setError("");
                setConfirmModalOpen(true);
              }}
              id="confirm-paid-btn"
            >
              ✓ Tandai Lunas
            </Button>
          )}
        </div>
      )}

      {info && (
        <div
          className="p-3 font-mono text-sm font-bold"
          style={{
            backgroundColor: "#00C853",
            border: "2px solid #0D0D0D",
            color: "#0D0D0D",
          }}
        >
          ✓ {info}
        </div>
      )}

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setError("");
        }}
        title="Konfirmasi Pembayaran"
        size="sm"
      >
        {error && (
          <div
            className="p-3 font-mono text-sm font-bold text-white mb-4"
            style={{ backgroundColor: "#FF3B3B", border: "2px solid #0D0D0D" }}
          >
            ⚠ {error}
          </div>
        )}
        <p className="font-sans text-sm text-nb-gray mb-4">
          Yakin ingin menandai transaksi ini sebagai{" "}
          <strong className="text-nb-green">LUNAS</strong>? Tindakan ini tidak
          dapat dibatalkan.
        </p>
        <p className="font-heading text-2xl text-nb-black mb-6">
          {formatCurrency(tx.totalAmount)}
        </p>
        <ModalFooter>
          <Button
            variant="white"
            onClick={() => {
              setConfirmModalOpen(false);
              setError("");
            }}
          >
            Batal
          </Button>
          <Button
            variant="green"
            loading={confirmLoading}
            onClick={handleConfirm}
            id="confirm-confirm-btn"
          >
            Ya, Tandai Lunas
          </Button>
        </ModalFooter>
      </Modal>

      {/* Proof Upload Modal */}
      <Modal
        isOpen={proofModalOpen}
        onClose={() => {
          setProofModalOpen(false);
          setError("");
        }}
        title="Upload Bukti Transfer"
        size="sm"
      >
        <div className="space-y-4">
          {error && (
            <div
              className="p-3 font-mono text-sm font-bold text-white"
              style={{ backgroundColor: "#FF3B3B", border: "2px solid #0D0D0D" }}
            >
              ⚠ {error}
            </div>
          )}

          <div
            className="border-2 border-dashed border-nb-black p-6 text-center"
            style={{ backgroundColor: "#FAFAF0" }}
          >
            {proofPreview ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofPreview}
                  alt="Preview"
                  className="max-h-40 object-contain border-2 border-nb-black"
                />
                <p className="font-mono text-xs text-nb-green font-bold">
                  ✓ {proofFile?.name}
                </p>
              </div>
            ) : (
              <p className="font-mono text-sm text-nb-gray">
                Pilih gambar bukti transfer
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-3 font-mono text-xs"
              id="proof-file-input"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="white"
            onClick={() => {
              setProofModalOpen(false);
              setError("");
            }}
          >
            Batal
          </Button>
          <Button
            variant="black"
            loading={proofLoading}
            onClick={handleProofUpload}
            disabled={!proofFile}
            id="upload-proof-submit"
          >
            Upload Bukti
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
