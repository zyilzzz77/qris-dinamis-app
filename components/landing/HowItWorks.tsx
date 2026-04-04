"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const steps = [
  {
    number: "01",
    title: "Upload QRIS Statis",
    description:
      "Ambil gambar QRIS statis dari bank atau e-wallet kamu. Upload ke bikinqrisdinamis — sistem akan otomatis membaca dan menyimpan data merchant kamu.",
    color: "var(--color-nb-yellow)",
  },
  {
    number: "02",
    title: "Set Nominal & Pajak",
    description:
      "Masukkan jumlah yang ingin diterima. Pilih jenis pajak (PPN, PPh, atau custom persentase). Lihat breakdown real-time sebelum generate.",
    color: "#00C853",
  },
  {
    number: "03",
    title: "Generate & Share QR",
    description:
      "QRIS dinamis berhasil dibuat! Download gambar QR-nya atau copy string QRIS-nya. QR berlaku 30 menit dan akan expire otomatis.",
    color: "#2563FF",
  },
  {
    number: "04",
    title: "Pantau Transaksi",
    description:
      "Pembeli scan QRIS, upload bukti transfer. Kamu konfirmasi di dashboard. Semua riwayat transaksi tersimpan rapi dan bisa difilter.",
    color: "#FF3B3B",
  },
];

export default function HowItWorks() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: stepsRef, isVisible: stepsVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section
      id="how-it-works"
      className="section-nb"
      style={{ backgroundColor: "#0D0D0D" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 anim-fade-up ${headerVisible ? "visible" : ""}`}
        >
          <span
            className="badge-nb text-sm mb-4 inline-block"
            style={{
              backgroundColor: "var(--color-nb-yellow)",
              color: "#0D0D0D",
              border: "2px solid var(--color-nb-yellow)",
            }}
          >
            Cara Kerja
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-white mt-4">
            4 Langkah Mudah
            <br />
            <span style={{ color: "var(--color-nb-yellow)" }}>
              Sudah Bisa Transaksi.
            </span>
          </h2>
        </div>

        {/* Steps */}
        <div
          ref={stepsRef as React.RefObject<HTMLDivElement>}
          className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-6 anim-stagger`}
        >
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`relative anim-fade-up ${stepsVisible ? "visible" : ""}`}
            >
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-8 left-full w-6 border-t-2 border-dashed z-10"
                  style={{ borderColor: "#3a3a3a" }}
                />
              )}

              <div
                className="p-6 hover:-translate-y-1 transition-transform duration-150"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: `2px solid ${step.color}`,
                  boxShadow: `4px 4px 0px ${step.color}`,
                }}
              >
                <div
                  className="font-heading text-5xl font-black mb-4"
                  style={{ color: step.color }}
                >
                  {step.number}
                </div>
                <h3 className="font-heading text-xl text-white mb-3">
                  {step.title}
                </h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
