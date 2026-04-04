"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Button from "@/components/ui/Button";
import type { QrisStatic } from "@/types";
import {
  Camera,
  ClipboardPaste,
  CheckCircle,
  ImageIcon,
  Download,
  AlertTriangle,
  ScanSearch,
} from "lucide-react";

interface QrisUploaderProps {
  onSuccess: (qrisStatic: QrisStatic) => void;
}

export default function QrisUploader({ onSuccess }: QrisUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawQris, setRawQris] = useState("");
  const [mode, setMode] = useState<"image" | "text">("image");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  async function handleProcess() {
    setError("");

    if (mode === "image" && !file) {
      setError("Silakan pilih file gambar QRIS terlebih dahulu.");
      return;
    }
    if (mode === "text" && !rawQris.trim()) {
      setError("Silakan masukkan string QRIS terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      if (file && mode === "image") {
        formData.append("file", file);
      }
      if (rawQris && mode === "text") {
        formData.append("rawQris", rawQris.trim());
      }

      const res = await fetch("/api/qris/upload", {
        method: "POST",
        body: formData,
      });

      let data: { data?: QrisStatic; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(data?.error || `Gagal memproses QRIS (HTTP ${res.status}).`);
        return;
      }

      if (!data?.data) {
        setError("Response server tidak valid.");
        return;
      }

      onSuccess(data.data);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-nb p-6 space-y-5">
      <div>
        <h3 className="font-heading text-xl text-nb-black mb-1">
          Upload QRIS Statis
        </h3>
        <p className="font-sans text-sm text-nb-gray">
          Upload gambar QRIS dari bank atau e-wallet kamu, atau paste langsung
          string QRIS.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex border-2 border-nb-black overflow-hidden w-fit">
        <button
          onClick={() => setMode("image")}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold transition-colors ${mode === "image" ? "bg-nb-black text-nb-yellow" : "bg-white text-nb-black hover:bg-nb-yellow/30"
            }`}
        >
          <Camera size={15} strokeWidth={2} />
          Upload Gambar
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-sm font-bold transition-colors border-l-2 border-nb-black ${mode === "text" ? "bg-nb-black text-nb-yellow" : "bg-white text-nb-black hover:bg-nb-yellow/30"
            }`}
        >
          <ClipboardPaste size={15} strokeWidth={2} />
          Paste String QRIS
        </button>
      </div>

      {mode === "image" ? (
        <div>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-150 pattern-stripe ${isDragActive
              ? "border-nb-blue bg-blue-50"
              : file
                ? "border-nb-green"
                : "border-nb-black hover:border-nb-blue hover:bg-white"
              }`}
            id="qris-dropzone"
          >
            <input {...getInputProps()} />
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview QRIS"
                  className="max-h-48 object-contain border-2 border-nb-black"
                />
                <p className="flex items-center gap-1.5 font-mono text-sm text-nb-green font-bold">
                  <CheckCircle size={15} strokeWidth={2.5} />
                  {file?.name}
                </p>
                <p className="font-mono text-xs text-nb-gray">
                  Klik atau drag untuk ganti gambar
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-16 h-16 flex items-center justify-center border-2 border-nb-black"
                  style={{
                    backgroundColor: isDragActive
                      ? "#2563FF"
                      : "var(--color-nb-yellow)",
                    boxShadow: "3px 3px 0px #0D0D0D",
                  }}
                >
                  {isDragActive
                    ? <Download size={28} strokeWidth={2} color="#fff" />
                    : <ImageIcon size={28} strokeWidth={2} color="#0D0D0D" />}
                </div>
                <div>
                  <p className="font-heading text-base text-nb-black">
                    {isDragActive ? "Lepaskan di sini!" : "Drag & drop gambar QRIS"}
                  </p>
                  <p className="font-mono text-xs text-nb-gray mt-1">
                    atau klik untuk memilih (PNG, JPG, max 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <label className="font-mono text-sm font-bold text-nb-black block mb-2">
            String QRIS
          </label>
          <textarea
            className="input-nb w-full h-32 resize-none font-mono text-xs"
            placeholder="00020101021226730016ID.CO.SHOPEE.WWW011893600914..."
            value={rawQris}
            onChange={(e) => setRawQris(e.target.value)}
            id="qris-raw-input"
          />
          <p className="font-mono text-xs text-nb-gray mt-1">
            Paste string QRIS yang dimulai dengan 000201...
          </p>
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-2 p-3 font-mono text-sm font-bold text-white"
          style={{ backgroundColor: "#FF3B3B", border: "2px solid #0D0D0D" }}
        >
          <AlertTriangle size={16} strokeWidth={2.5} />
          {error}
        </div>
      )}

      <Button
        variant="black"
        size="lg"
        loading={loading}
        onClick={handleProcess}
        className="w-full flex items-center justify-center gap-2"
        id="process-qris-btn"
      >
        <ScanSearch size={18} strokeWidth={2} />
        Proses QRIS
      </Button>
    </div>
  );
}
