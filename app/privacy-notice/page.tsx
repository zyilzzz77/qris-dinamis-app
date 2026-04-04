import type { Metadata } from "next";
import { SEO_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Privacy Notice",
    description:
        "Informasi kebijakan privasi platform bikin QRIS dinamis untuk UMKM, termasuk pengelolaan data akun dan data transaksi.",
    keywords: [...SEO_KEYWORDS, "privacy notice qris", "kebijakan privasi qris dinamis"],
    alternates: {
        canonical: "/privacy-notice",
    },
    openGraph: {
        title: "Privacy Notice - bikinqrisdinamis",
        description:
            "Kebijakan privasi pengguna layanan QRIS dinamis dan dashboard transaksi.",
        url: "/privacy-notice",
        type: "article",
    },
};

export default function PrivacyNoticePage() {
    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h1 className="font-heading text-3xl sm:text-4xl text-nb-black">Privacy Notice</h1>
            <p className="font-sans text-nb-gray mt-3 leading-relaxed">
                Kami menghargai privasi pengguna. Halaman ini menjelaskan bagaimana data
                dikumpulkan, digunakan, dan dilindungi saat menggunakan layanan
                bikinqrisdinamis.
            </p>

            <section className="mt-8 card-nb p-6 space-y-4 font-sans text-sm text-nb-gray leading-relaxed">
                <p>
                    Kami mengumpulkan data akun seperti nama, email, dan aktivitas
                    transaksi yang diperlukan untuk menjalankan fitur autentikasi,
                    dashboard, serta pelacakan status pembayaran.
                </p>
                <p>
                    Data bukti transfer hanya digunakan untuk verifikasi pembayaran dan
                    tidak akan dipublikasikan kepada pihak lain tanpa persetujuan pengguna,
                    kecuali diwajibkan oleh hukum yang berlaku.
                </p>
                <p>
                    Kami menerapkan kontrol akses pada akun, membatasi akses data berdasar
                    kepemilikan pengguna, serta melakukan upaya keamanan teknis untuk
                    mencegah akses tidak sah.
                </p>
                <p>
                    Dengan menggunakan layanan ini, kamu menyetujui praktik pengelolaan data
                    sebagaimana tertulis pada Privacy Notice ini.
                </p>
            </section>
        </main>
    );
}
