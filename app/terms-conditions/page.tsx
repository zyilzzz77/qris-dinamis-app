import type { Metadata } from "next";
import { SEO_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Terms & Conditions",
    description:
        "Ketentuan penggunaan layanan bikin QRIS gratis dan QRIS dinamis, termasuk aturan transaksi, status pembayaran, dan validasi bukti transfer.",
    keywords: [
        ...SEO_KEYWORDS,
        "terms and conditions qris",
        "syarat ketentuan qris dinamis",
    ],
    alternates: {
        canonical: "/terms-conditions",
    },
    openGraph: {
        title: "Terms & Conditions - bikinqrisdinamis",
        description:
            "Syarat dan ketentuan penggunaan layanan QRIS dinamis untuk merchant UMKM.",
        url: "/terms-conditions",
        type: "article",
    },
};

const terms = [
    "Pengguna bertanggung jawab atas keakuratan data transaksi yang diinput.",
    "Akun tidak boleh dipakai untuk aktivitas yang melanggar hukum.",
    "Transaksi dapat berstatus gagal (FAILED) jika melewati batas waktu yang ditentukan.",
    "Status lunas hanya dapat ditetapkan setelah bukti transfer valid diunggah.",
    "Layanan dapat diperbarui sewaktu-waktu untuk peningkatan keamanan dan stabilitas.",
];

export default function TermsConditionsPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h1 className="font-heading text-3xl sm:text-4xl text-nb-black">Terms & Conditions</h1>
            <p className="font-sans text-nb-gray mt-3 leading-relaxed">
                Ketentuan penggunaan ini berlaku untuk seluruh pengguna platform
                bikinqrisdinamis.
            </p>

            <section className="mt-8 card-nb p-6">
                <ol className="list-decimal pl-5 space-y-3 font-sans text-sm text-nb-gray leading-relaxed">
                    {terms.map((term) => (
                        <li key={term}>{term}</li>
                    ))}
                </ol>
            </section>
        </main>
    );
}
