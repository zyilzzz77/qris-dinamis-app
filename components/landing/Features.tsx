"use client";

import {
  Zap,
  Receipt,
  BarChart2,
  ShieldCheck,
  Smartphone,
  Gift,
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    Icon: Zap,
    title: "Konversi Instan",
    description:
      "Upload QRIS statis kamu sekali, lalu generate QRIS dinamis dengan nominal berapa saja dalam hitungan detik. Tidak perlu aplikasi khusus merchant.",
    color: "var(--color-nb-yellow)",
  },
  {
    Icon: Receipt,
    title: "Kalkulasi Pajak Otomatis",
    description:
      "Setting PPN 11%, PPh 2%, atau persentase custom sesuai kebutuhan bisnis kamu. Breakdown pajak tampil real-time sebelum generate.",
    color: "#00C853",
  },
  {
    Icon: BarChart2,
    title: "Manajemen Transaksi",
    description:
      "Pantau semua transaksi dalam satu dashboard. Filter by status, upload bukti transfer, dan konfirmasi pembayaran manual dengan mudah.",
    color: "#2563FF",
  },
  {
    Icon: ShieldCheck,
    title: "Aman & Terpercaya",
    description:
      "Data QRIS kamu disimpan aman di Supabase. QR code di-generate server-side dan expired otomatis dalam 30 menit untuk keamanan maksimal.",
    color: "#FF3B3B",
  },
  {
    Icon: Smartphone,
    title: "Scan dengan Semua Aplikasi",
    description:
      "QRIS dinamis yang dihasilkan kompatibel 100% dengan semua aplikasi bank dan e-wallet yang mendukung QRIS di Indonesia.",
    color: "#FF6B00",
  },
  {
    Icon: Gift,
    title: "Gratis untuk UMKM",
    description:
      "Mulai gratis tanpa batas waktu. Ideal untuk pelaku UMKM, freelancer, dan usaha kecil yang butuh solusi pembayaran digital fleksibel.",
    color: "#7C3AED",
  },
];

export default function Features() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section id="features" className="section-nb bg-white border-b-2 border-nb-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 anim-fade-up ${headerVisible ? "visible" : ""}`}
        >
          <span className="badge-nb badge-nb-pending text-sm mb-4 inline-block">
            Kenapa bikinqrisdinamis?
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-nb-black mt-4">
            Semua yang Kamu Butuhkan,
            <br />
            <span
              style={{
                background: "var(--color-nb-yellow)",
                padding: "0 6px",
                boxShadow: "3px 3px 0px #0D0D0D",
              }}
            >
              dalam Satu Platform.
            </span>
          </h2>
          <p className="font-sans text-lg text-nb-gray mt-6 max-w-2xl mx-auto">
            Dirancang khusus untuk UMKM Indonesia yang ingin bertransaksi lebih
            profesional dengan QRIS dinamis.
          </p>
        </div>

        {/* Feature Grid */}
        <div
          ref={gridRef as React.RefObject<HTMLDivElement>}
          className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 anim-stagger ${gridVisible ? "visible" : ""}`}
        >
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`card-nb card-nb-hover p-6 anim-fade-up ${gridVisible ? "visible" : ""}`}
            >
              <div
                className="w-14 h-14 flex items-center justify-center border-2 border-nb-black mb-4"
                style={{
                  backgroundColor: feature.color,
                  boxShadow: "3px 3px 0px #0D0D0D",
                }}
              >
                <feature.Icon size={28} strokeWidth={2} color="#0D0D0D" />
              </div>
              <h3 className="font-heading text-xl text-nb-black mb-2">
                {feature.title}
              </h3>
              <p className="font-sans text-sm text-nb-gray leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
