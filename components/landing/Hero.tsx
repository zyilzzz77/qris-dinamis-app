"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // slight delay so CSS transition fires after first paint
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-nb-bg border-b-2 border-nb-black">
      {/* Polka dot background */}
      <div className="absolute inset-0 pattern-dots opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <div className={`flex flex-col gap-6 anim-slide-left ${mounted ? "visible" : ""}`}>
            {/* Tag */}
            <div className="inline-flex">
              <span className="badge-nb badge-nb-green text-base px-3 py-1">
                🇮🇩 Platform QRIS Terpercaya
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-5xl lg:text-6xl xl:text-7xl leading-tight text-nb-black">
              Ubah QRIS Statis
              <br />
              <span
                className="relative inline-block"
                style={{
                  background: "var(--color-nb-yellow)",
                  padding: "0 8px",
                  boxShadow: "4px 4px 0px #0D0D0D",
                }}
              >
                jadi Dinamis
              </span>
              <br />
              dalam Detik.
            </h1>

            {/* Subheadline */}
            <p className="font-sans text-lg text-nb-gray max-w-md leading-relaxed">
              Platform terbaik untuk UMKM. Upload QRIS statis kamu, set nominal
              custom, hitung pajak otomatis, dan kelola semua transaksi dalam
              satu dashboard.
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/sign-up">
                <Button variant="black" size="lg">
                  Mulai Gratis Sekarang
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="white" size="lg">
                  Lihat Cara Kerja →
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-2">
                {["🧑‍💼", "👩‍🍳", "🧑‍🎨", "👩‍💻"].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 flex items-center justify-center bg-white border-2 border-nb-black text-lg"
                    style={{ zIndex: 4 - i }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="font-mono text-sm text-nb-gray">
                <strong className="text-nb-black">2,500+</strong> UMKM sudah
                bergabung
              </p>
            </div>
          </div>

          {/* Right — Visual mockup */}
          <div className={`relative flex justify-center lg:justify-end anim-slide-right ${mounted ? "visible" : ""}`}>
            <div className="relative animate-float">
              {/* Main card */}
              <div className="card-nb w-80 p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono text-xs text-nb-gray font-bold uppercase tracking-widest">
                      QRIS Dinamis
                    </p>
                    <p className="font-heading text-2xl text-nb-black mt-1">
                      bikinqrisdinamis
                    </p>
                  </div>
                  <span className="badge-nb badge-nb-green">AKTIF</span>
                </div>

                {/* Fake QR code */}
                <div
                  className="w-52 h-52 mx-auto border-2 border-nb-black p-3 bg-nb-bg flex items-center justify-center"
                  style={{ boxShadow: "4px 4px 0px #0D0D0D" }}
                >
                  <div className="grid grid-cols-7 gap-0.5 w-full h-full">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div
                        key={i}
                        className={`${[
                          0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 20, 21, 27, 28,
                          34, 35, 41, 42, 43, 44, 45, 46, 47, 48, 8, 15, 22,
                          29, 36, 10, 17, 24, 31, 38, 12, 19, 26, 23, 25,
                        ].includes(i)
                          ? "bg-nb-black"
                          : "bg-nb-bg"
                          }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t-2 border-nb-black">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-nb-gray font-bold">
                      TOTAL
                    </span>
                    <span className="font-heading text-xl text-nb-black">
                      Rp 110.000
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-mono text-xs text-nb-gray">
                      Termasuk PPN 10%
                    </span>
                    <span className="font-mono text-xs text-nb-green font-bold">
                      30 menit
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div
                className="absolute -top-4 -right-4 bg-nb-yellow border-2 border-nb-black p-3"
                style={{ boxShadow: "3px 3px 0px #0D0D0D" }}
              >
                <p className="font-heading text-sm font-black">+PPN</p>
                <p className="font-mono text-xs text-nb-gray font-bold">
                  Auto
                </p>
              </div>

              <div
                className="absolute -bottom-4 -left-4 bg-nb-green border-2 border-nb-black p-3"
                style={{ boxShadow: "3px 3px 0px #0D0D0D" }}
              >
                <p className="font-heading text-sm font-black text-nb-black">
                  ✓ LUNAS
                </p>
                <p className="font-mono text-xs text-nb-black font-bold">
                  Terlacak
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
