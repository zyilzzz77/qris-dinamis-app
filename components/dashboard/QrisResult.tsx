"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { ModalFooter } from "@/components/ui/Modal";
import type { GenerateQrisResponse } from "@/types";
import { AlertTriangle, Clock, Check, Copy, Download } from "lucide-react";

interface QrisResultProps {
  result: GenerateQrisResponse;
  onClose: () => void;
}

export default function QrisResult({ result, onClose }: QrisResultProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds

  // Countdown timer
  useEffect(() => {
    const expiresAt = new Date(result.expiresAt).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [result.expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpiring = timeLeft < 5 * 60; // < 5 min

  async function copyQrisString() {
    try {
      await navigator.clipboard.writeText(result.qrisString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  async function downloadQrImage() {
    const res = await fetch(result.qrisImageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qris-dinamis-${result.transactionId.slice(-6)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Timer */}
      <div
        className={`flex items-center justify-between p-3 border-2 border-nb-black font-mono ${
          isExpiring ? "bg-nb-red text-white" : "bg-nb-green text-nb-black"
        }`}
        style={{ boxShadow: "3px 3px 0px #0D0D0D" }}
      >
        <span className="flex items-center gap-1.5 text-sm font-bold">
          {isExpiring
            ? <><AlertTriangle size={15} strokeWidth={2.5} /> Segera kadaluarsa!</>
            : <><Clock size={15} strokeWidth={2} /> Berlaku</>}
        </span>
        <span className="text-2xl font-black">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center">
        <div
          className="border-2 border-nb-black p-4 bg-nb-bg"
          style={{ boxShadow: "4px 4px 0px #0D0D0D" }}
        >
          <Image
            src={result.qrisImageUrl}
            alt="QRIS Dinamis"
            width={240}
            height={240}
            className="block"
          />
        </div>
      </div>

      {/* Amount breakdown */}
      <div
        className="p-4 border-2 border-nb-black font-mono text-sm space-y-2"
        style={{ backgroundColor: "#FAFAF0" }}
      >
        {result.taxAmount > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-nb-gray">Nominal:</span>
              <span>{formatCurrency(result.baseAmount)}</span>
            </div>
            <div className="flex justify-between text-nb-orange">
              <span>Pajak:</span>
              <span>+{formatCurrency(result.taxAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-black text-nb-black text-base border-t-2 border-nb-black pt-2">
          <span>TOTAL:</span>
          <span>{formatCurrency(result.totalAmount)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="white"
          onClick={copyQrisString}
          className="w-full"
          id="copy-qris-btn"
        >
          {copied
            ? <><Check size={14} strokeWidth={2.5} /> Tersalin!</>
            : <><Copy size={14} strokeWidth={2} /> Copy QRIS</>}
        </Button>
        <Button
          variant="black"
          onClick={downloadQrImage}
          className="w-full"
          id="download-qr-btn"
        >
          <Download size={16} strokeWidth={2} /> Download QR
        </Button>
      </div>

      <ModalFooter>
        <Link href={`/transaction/${result.transactionId}`}>
          <Button variant="green" id="view-transaction-btn">
            Lihat Transaksi →
          </Button>
        </Link>
        <Button variant="white" onClick={onClose}>
          Tutup
        </Button>
      </ModalFooter>
    </div>
  );
}
