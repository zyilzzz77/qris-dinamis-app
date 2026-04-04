"use client";

import Link from "next/link";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function SeoContent() {
    const { ref: titleRef, isVisible: titleVisible } = useScrollAnimation();
    const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation({ threshold: 0.1 });

    return (
        <section className="section-nb bg-white border-b-2 border-nb-black">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div
                    ref={titleRef as React.RefObject<HTMLDivElement>}
                    className={`anim-fade-up ${titleVisible ? "visible" : ""}`}
                >
                    <h2 className="font-heading text-3xl sm:text-4xl text-nb-black">
                        Cara Ubah QRIS Static Jadi QRIS Dinamis
                    </h2>
                    <p className="font-sans text-base text-nb-gray mt-4 leading-relaxed">
                        Kalau kamu sedang mencari cara ubah QRIS static jadi QRIS dinamis,
                        alurnya sederhana: upload QRIS statis, tentukan nominal, lalu generate
                        QRIS dinamis yang siap dipakai transaksi. Proses ini cocok untuk UMKM
                        yang ingin pembayaran lebih rapi tanpa hitung manual.
                    </p>
                </div>

                <div
                    ref={cardsRef as React.RefObject<HTMLDivElement>}
                    className={`grid sm:grid-cols-2 gap-4 mt-8 anim-stagger`}
                >
                    <article className={`card-nb p-5 anim-slide-left ${cardsVisible ? "visible" : ""}`}>
                        <h3 className="font-heading text-xl text-nb-black">
                            Bikin QRIS Gratis untuk UMKM
                        </h3>
                        <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                            Mulai dari paket gratis untuk kebutuhan harian kasir. Kamu bisa
                            pelajari alur lengkap di halaman FAQ, lalu lanjut daftar akun saat
                            sudah siap dipakai operasional.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <Link href="/help-faq" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                                Lihat Help & FAQ
                            </Link>
                            <Link href="/sign-up" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                                Daftar Gratis
                            </Link>
                        </div>
                    </article>

                    <article className={`card-nb p-5 anim-slide-right ${cardsVisible ? "visible" : ""}`}>
                        <h3 className="font-heading text-xl text-nb-black">
                            Endpoint API Bikin QRIS Dinamis
                        </h3>
                        <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                            Untuk integrasi website eksternal, tersedia endpoint API bikin QRIS
                            dinamis sehingga checkout dapat otomatis membuat transaksi dan
                            memantau status pembayaran.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <Link href="/blog-updates" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                                Baca Update API
                            </Link>
                            <Link href="/about-us" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                                Kenal Tim Kami
                            </Link>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}
