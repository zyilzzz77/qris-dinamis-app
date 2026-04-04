import type { Metadata } from "next";
import Link from "next/link";
import { SEO_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Blog & Updates",
    description:
        "Update fitur terbaru seputar bikin QRIS dinamis, cara ubah QRIS static jadi dinamis, dan pengembangan endpoint API QRIS.",
    keywords: [
        ...SEO_KEYWORDS,
        "blog qris dinamis",
        "update endpoint qris dinamis",
    ],
    alternates: {
        canonical: "/blog-updates",
    },
    openGraph: {
        title: "Blog & Updates - bikinqrisdinamis",
        description:
            "Rilis fitur, perubahan aturan transaksi, dan pembaruan endpoint API QRIS dinamis.",
        url: "/blog-updates",
        type: "article",
    },
};

const updates = [
    {
        title: "Aturan timeout transaksi kini 10 menit",
        date: "2026-01-08",
        summary:
            "Transaksi yang tidak selesai dalam 10 menit akan otomatis berubah menjadi FAILED untuk menjaga konsistensi status pembayaran.",
    },
    {
        title: "Endpoint bukti transfer dan konfirmasi diperkuat",
        date: "2026-01-05",
        summary:
            "Status PAID sekarang mensyaratkan bukti transfer sudah diunggah agar proses verifikasi lebih aman.",
    },
    {
        title: "Tema antarmuka hijau diterapkan global",
        date: "2026-01-02",
        summary:
            "Penyegaran visual dilakukan di seluruh aplikasi dengan aksen hijau agar tampilan lebih konsisten.",
    },
];

export default function BlogUpdatesPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h1 className="font-heading text-3xl sm:text-4xl text-nb-black">Blog & Updates</h1>
            <p className="font-sans text-nb-gray mt-3 leading-relaxed">
                Catatan update produk, perubahan fitur, dan informasi rilis terbaru.
            </p>

            <section className="mt-8 space-y-4">
                {updates.map((update) => (
                    <article key={update.title} className="card-nb p-5">
                        <p className="font-mono text-xs text-nb-gray font-bold">{update.date}</p>
                        <h2 className="font-heading text-xl text-nb-black mt-2">{update.title}</h2>
                        <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                            {update.summary}
                        </p>
                    </article>
                ))}
            </section>

            <section className="mt-8 card-nb p-5">
                <h2 className="font-heading text-2xl text-nb-black">Tautan Internal Terkait</h2>
                <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                    Pelajari panduan bikin QRIS gratis, alur konversi QRIS static ke
                    dinamis, dan profil platform untuk memperkuat implementasi di bisnis kamu.
                </p>

                <nav aria-label="Tautan internal blog" className="mt-4 flex flex-wrap gap-4">
                    <Link href="/help-faq" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        Help & FAQ
                    </Link>
                    <Link href="/about-us" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        About Us
                    </Link>
                    <Link href="/terms-conditions" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        Terms & Conditions
                    </Link>
                    <Link href="/" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        Halaman Utama QRIS Dinamis
                    </Link>
                </nav>
            </section>
        </main>
    );
}
