import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { SEO_KEYWORDS, getFaqJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Help & FAQ",
    description:
        "FAQ lengkap tentang cara bikin QRIS gratis, cara ubah QRIS static jadi QRIS dinamis, dan penggunaan endpoint API QRIS dinamis.",
    keywords: [
        ...SEO_KEYWORDS,
        "faq qris dinamis",
        "cara bikin qris dinamis",
        "cara ubah qris static ke qris dinamis",
    ],
    alternates: {
        canonical: "/help-faq",
    },
    openGraph: {
        title: "Help & FAQ - bikinqrisdinamis",
        description:
            "Panduan dan FAQ cara bikin QRIS dinamis, konversi QRIS static, dan integrasi endpoint API.",
        url: "/help-faq",
        type: "article",
    },
};

const faqs = [
    {
        question: "Bagaimana cara membuat QRIS dinamis?",
        answer:
            "Upload QRIS statis kamu, isi nominal transaksi, lalu sistem akan membuat QRIS dinamis yang siap dibayar.",
    },
    {
        question: "Apakah bukti transfer wajib diunggah?",
        answer:
            "Ya. Untuk keamanan, transaksi tidak bisa ditandai lunas sebelum bukti transfer diunggah.",
    },
    {
        question: "Berapa lama masa berlaku transaksi?",
        answer:
            "Setiap transaksi aktif maksimal 10 menit. Setelah itu status akan berubah menjadi gagal (FAILED).",
    },
    {
        question: "Apakah saya bisa cek status pembayaran lewat API?",
        answer:
            "Bisa. Gunakan endpoint status pada dokumentasi API untuk memeriksa status transaksi secara real-time.",
    },
];

const faqJsonLd = getFaqJsonLd(faqs);

export default function HelpFaqPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <JsonLd data={faqJsonLd} />
            <h1 className="font-heading text-3xl sm:text-4xl text-nb-black">Help & FAQ</h1>
            <p className="font-sans text-nb-gray mt-3">
                Pusat bantuan untuk pertanyaan yang paling sering ditanyakan seputar QRIS
                dinamis, transaksi, dan penggunaan dashboard.
            </p>

            <section className="mt-8">
                <h2 className="font-heading text-2xl text-nb-black mb-4">
                    Pertanyaan Umum Seputar Bikin QRIS Dinamis
                </h2>

                <div className="space-y-4">
                    {faqs.map((item) => (
                        <article key={item.question} className="card-nb p-5">
                            <h3 className="font-heading text-xl text-nb-black">{item.question}</h3>
                            <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                                {item.answer}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mt-8 card-nb p-5">
                <h2 className="font-heading text-2xl text-nb-black">Baca Juga</h2>
                <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                    Supaya pemahaman kamu makin lengkap tentang cara ubah QRIS static jadi
                    QRIS dinamis dan strategi implementasinya, lihat halaman berikut.
                </p>

                <nav aria-label="Tautan internal terkait FAQ" className="mt-4 flex flex-wrap gap-4">
                    <Link href="/" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        Beranda QRIS Dinamis
                    </Link>
                    <Link href="/about-us" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        Tentang Kami
                    </Link>
                    <Link href="/blog-updates" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        Blog & Updates
                    </Link>
                    <Link href="/sign-up" className="font-mono text-xs font-bold text-nb-blue underline underline-offset-2">
                        Mulai Bikin QRIS Gratis
                    </Link>
                </nav>
            </section>
        </main>
    );
}
