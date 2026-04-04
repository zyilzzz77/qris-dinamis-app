"use client";

import { useState } from "react";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency, calculateTax } from "@/lib/utils";
import QrisResult from "./QrisResult";
import type { TaxType, GenerateQrisResponse } from "@/types";

interface CreateQrisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAX_OPTIONS: { value: TaxType; label: string; rate: string }[] = [
  { value: "NONE", label: "Tanpa Pajak", rate: "0%" },
  { value: "PPN", label: "PPN", rate: "11%" },
  { value: "PPH", label: "PPh Pasal 22", rate: "2%" },
  { value: "CUSTOM", label: "Custom", rate: "..." },
];

export default function CreateQrisModal({
  isOpen,
  onClose,
}: CreateQrisModalProps) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [baseAmount, setBaseAmount] = useState("");
  const [description, setDescription] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("NONE");
  const [customRate, setCustomRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateQrisResponse | null>(null);

  const amount = parseFloat(baseAmount.replace(/\D/g, "")) || 0;
  const { taxAmount, totalAmount } = calculateTax(
    amount,
    taxType,
    parseFloat(customRate) || 0
  );

  function formatInput(value: string): string {
    const num = value.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  async function handleGenerate() {
    setError("");

    if (amount < 1000) {
      setError("Nominal minimal Rp 1.000");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/qris/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseAmount: amount,
          taxType,
          customTaxRate: parseFloat(customRate) || 0,
          description,
        }),
      });

      let data: { data?: GenerateQrisResponse; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(data?.error || `Gagal generate QRIS (HTTP ${res.status}).`);
        return;
      }

      if (!data?.data) {
        setError("Response server tidak valid.");
        return;
      }

      setResult(data.data);
      setStep("result");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("form");
    setBaseAmount("");
    setDescription("");
    setTaxType("NONE");
    setCustomRate("");
    setError("");
    setResult(null);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "form" ? "Buat QRIS Dinamis" : "QRIS Siap Digunakan! 🎉"}
      size="md"
    >
      {step === "form" ? (
        <div className="space-y-5">
          {/* Nominal */}
          <div>
            <label className="font-mono text-sm font-bold text-nb-black block mb-1.5">
              Nominal (Rp)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 w-14 flex items-center justify-center font-mono text-sm font-bold text-nb-gray pointer-events-none select-none">
                Rp
              </span>
              <input
                type="text"
                className="input-nb"
                style={{ paddingLeft: "4.25rem" }}
                placeholder="0.000"
                value={baseAmount}
                onChange={(e) => setBaseAmount(formatInput(e.target.value))}
                id="qris-amount-input"
              />
            </div>
          </div>

          {/* Description */}
          <Input
            id="qris-description"
            type="text"
            label="Deskripsi (Opsional)"
            placeholder="Pembayaran pesanan #001"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Tax Type */}
          <div>
            <label className="font-mono text-sm font-bold text-nb-black block mb-2">
              Pajak
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TAX_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTaxType(opt.value)}
                  className={`p-3 border-2 text-left transition-all duration-100 ${taxType === opt.value
                    ? "border-nb-black bg-nb-yellow shadow-nb-sm"
                    : "border-nb-gray-light bg-white hover:border-nb-black"
                    }`}
                >
                  <p className="font-mono text-sm font-bold text-nb-black">
                    {opt.label}
                  </p>
                  <p className="font-mono text-xs text-nb-gray">{opt.rate}</p>
                </button>
              ))}
            </div>

            {taxType === "CUSTOM" && (
              <div className="mt-2">
                <Input
                  id="custom-tax-rate"
                  type="number"
                  label="Persentase Custom (%)"
                  placeholder="5"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>
            )}
          </div>

          {/* Tax Breakdown */}
          {amount > 0 && (
            <div
              className="p-4 border-2 border-nb-black font-mono text-sm space-y-2"
              style={{ backgroundColor: "#FAFAF0" }}
            >
              <div className="flex justify-between">
                <span className="text-nb-gray">Nominal:</span>
                <span className="font-bold">{formatCurrency(amount)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-nb-orange">
                  <span>Pajak:</span>
                  <span className="font-bold">+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div
                className="flex justify-between pt-2 border-t-2 border-nb-black font-black text-nb-black text-base"
              >
                <span>TOTAL:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-3 font-mono text-sm font-bold text-white"
              style={{
                backgroundColor: "#FF3B3B",
                border: "2px solid #0D0D0D",
              }}
            >
              ⚠ {error}
            </div>
          )}

          <ModalFooter>
            <Button variant="white" onClick={handleClose}>
              Batal
            </Button>
            <Button
              variant="black"
              loading={loading}
              onClick={handleGenerate}
              id="generate-qris-btn"
            >
              Generate QRIS →
            </Button>
          </ModalFooter>
        </div>
      ) : result ? (
        <QrisResult result={result} onClose={handleClose} />
      ) : null}
    </Modal>
  );
}
