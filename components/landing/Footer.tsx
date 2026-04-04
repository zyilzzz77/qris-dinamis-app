"use client";

import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function Footer() {
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();
  const { ref: linksRef, isVisible: linksVisible } = useScrollAnimation({ threshold: 0.1 });
  return (
    <footer className="border-t-2 border-nb-black bg-nb-black text-white">
      {/* CTA Banner */}
      <div
        ref={ctaRef as React.RefObject<HTMLDivElement>}
        className={`border-b-2 border-nb-black py-16 px-4 text-center pattern-dots-yellow anim-scale-up ${ctaVisible ? "visible" : ""}`}
        style={{ background: "var(--color-nb-yellow)" }}
      >
        <h2 className="font-heading text-4xl lg:text-5xl text-nb-black mb-4">
          Siap Mulai Sekarang?
        </h2>
        <p className="font-sans text-lg text-nb-gray mb-8 max-w-xl mx-auto">
          Daftar gratis dalam 30 detik. Tidak perlu kartu kredit.
          Langsung bisa mulai generate QRIS dinamis.
        </p>
        <Link href="/sign-up">
          <Button variant="black" size="lg">
            Daftar Gratis — Mulai Sekarang
          </Button>
        </Link>
      </div>

      {/* Footer Links */}
      <div
        ref={linksRef as React.RefObject<HTMLDivElement>}
        className={`max-w-7xl mx-auto px-4 sm:px-6 py-12 anim-fade-up ${linksVisible ? "visible" : ""}`}
      >
        <div className="grid sm:grid-cols-3 gap-8">
          <div>
            <p className="font-heading text-2xl text-nb-yellow mb-3">
              bikinqrisdinamis
            </p>
            <p className="font-sans text-sm text-gray-400 leading-relaxed">
              Platform UMKM terbaik untuk konversi QRIS statis ke dinamis.
              Dibuat dengan 💛 di Indonesia.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-nb-yellow mb-4">
              Navigasi
            </p>
            <ul className="space-y-2">
              {[
                { href: "/", label: "Beranda" },
                { href: "#features", label: "Fitur" },
                { href: "#how-it-works", label: "Cara Kerja" },
                { href: "/sign-up", label: "Daftar" },
                { href: "/sign-in", label: "Masuk" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-sans text-sm text-gray-400 hover:text-nb-yellow transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-nb-yellow mb-4">
              Kompatibel dengan
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "BCA",
                "Mandiri",
                "BNI",
                "BRI",
                "GoPay",
                "OVO",
                "DANA",
                "ShopeePay",
              ].map((bank) => (
                <span
                  key={bank}
                  className="font-mono text-xs px-2 py-1 border border-gray-600 text-gray-400"
                >
                  {bank}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 mt-8 border-t border-gray-800 gap-4">
          <p className="font-mono text-xs text-gray-500">
            © 2026 bikinqrisdinamis. All rights reserved.
          </p>
          <p className="font-mono text-xs text-gray-500">
            QRIS adalah produk Bank Indonesia &amp; ASPI
          </p>
        </div>
      </div>
    </footer>
  );
}
