import type { Metadata } from "next";
import { SEO_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "DMCA Disclaimer",
    description:
        "Pernyataan DMCA dan prosedur pelaporan pelanggaran hak cipta pada platform bikin QRIS dinamis untuk UMKM.",
    keywords: [...SEO_KEYWORDS, "dmca disclaimer", "hak cipta qris"],
    alternates: {
        canonical: "/dmca-disclaimer",
    },
    openGraph: {
        title: "DMCA Disclaimer - bikinqrisdinamis",
        description:
            "Prosedur pelaporan konten terkait hak cipta sesuai ketentuan DMCA.",
        url: "/dmca-disclaimer",
        type: "article",
    },
};

export default function DmcaDisclaimerPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h1 className="font-heading text-3xl sm:text-4xl text-nb-black">DMCA Disclaimer</h1>
            <p className="font-sans text-nb-gray mt-3 leading-relaxed">
                Kami menghormati hak kekayaan intelektual pihak lain. Jika kamu meyakini
                ada konten yang melanggar hak cipta di platform ini, silakan kirim
                pemberitahuan resmi melalui kanal kontak yang tersedia.
            </p>

            <section className="mt-8 card-nb p-6 space-y-4 font-sans text-sm text-nb-gray leading-relaxed">
                <p>
                    Pemberitahuan DMCA harus memuat informasi identitas pemilik hak,
                    deskripsi karya yang dilanggar, lokasi konten yang dilaporkan, serta
                    pernyataan itikad baik.
                </p>
                <p>
                    Setelah menerima laporan valid, kami akan meninjau, menonaktifkan
                    konten terkait bila diperlukan, dan menindaklanjuti sesuai ketentuan
                    hukum yang berlaku.
                </p>
            </section>
        </main>
    );
}
