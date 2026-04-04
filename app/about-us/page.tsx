import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { SEO_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "About Us",
    description:
        "Cerita, visi, misi, dan komitmen bikinqrisdinamis dalam membantu UMKM Indonesia bertransaksi dengan QRIS dinamis.",
    keywords: [
        ...SEO_KEYWORDS,
        "tentang bikinqrisdinamis",
        "platform qris dinamis indonesia",
    ],
    alternates: {
        canonical: "/about-us",
    },
    openGraph: {
        title: "About Us - bikinqrisdinamis",
        description:
            "Mengenal visi, misi, dan komitmen platform konversi QRIS static ke QRIS dinamis.",
        url: "/about-us",
        type: "article",
    },
};

const coreValues = [
    {
        title: "Jelas",
        detail:
            "Setiap status transaksi harus mudah dipahami. Dari PENDING sampai PAID atau FAILED, tidak ada status abu-abu.",
    },
    {
        title: "Cepat",
        detail:
            "Alur pembuatan QRIS dinamis dibuat ringkas agar merchant bisa menerima pembayaran dalam hitungan detik.",
    },
    {
        title: "Aman",
        detail:
            "Konfirmasi lunas wajib didukung bukti transfer, sehingga proses verifikasi lebih disiplin dan minim salah input.",
    },
    {
        title: "Tumbuh Bersama",
        detail:
            "Kami mendesain produk untuk UMKM yang sedang berkembang, dari toko rumahan sampai jaringan cabang kecil.",
    },
];

const milestones = [
    {
        period: "Q1 2025",
        title: "Riset Operasional UMKM",
        detail:
            "Tim melakukan wawancara dengan pemilik usaha untuk memetakan pain point pembayaran QRIS statis yang tidak fleksibel.",
    },
    {
        period: "Q2 2025",
        title: "Prototype QRIS Dinamis",
        detail:
            "Versi awal generator QRIS dinamis diuji pada skenario kasir cepat dan transaksi invoice sederhana.",
    },
    {
        period: "Q4 2025",
        title: "Dashboard dan API Publik",
        detail:
            "Peluncuran dashboard transaksi dan endpoint API agar integrasi ke website eksternal bisa dilakukan lebih mudah.",
    },
    {
        period: "Q1 2026",
        title: "Penguatan Validasi Pembayaran",
        detail:
            "Aturan bukti transfer dan timeout transaksi 10 menit diterapkan untuk menjaga konsistensi data pembayaran.",
    },
];

export default function AboutUsPage() {
    return (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <section className="card-nb p-6 sm:p-8">
                <p className="font-mono text-xs font-bold tracking-widest text-nb-gray uppercase">
                    Cerita Kami
                </p>
                <h1 className="font-heading text-3xl sm:text-5xl text-nb-black mt-3">
                    About Us
                </h1>
                <p className="font-sans text-nb-gray mt-4 leading-relaxed max-w-3xl">
                    bikinqrisdinamis lahir dari kebutuhan sederhana: merchant UMKM butuh
                    cara menerima pembayaran QRIS yang lebih praktis, bisa menentukan
                    nominal transaksi dengan cepat, dan punya jejak pembayaran yang rapi.
                    Kami membangun platform ini untuk mengubah proses manual yang rawan
                    salah hitung menjadi alur digital yang lebih presisi.
                </p>
            </section>

            <section className="mt-8 grid sm:grid-cols-3 gap-4">
                <article className="card-nb p-5">
                    <p className="font-mono text-xs font-bold text-nb-gray uppercase">
                        Visi
                    </p>
                    <h2 className="font-heading text-xl text-nb-black mt-2">
                        Pembayaran yang Tidak Ribet
                    </h2>
                    <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                        Menjadikan pembayaran digital sebagai proses yang cepat dipahami oleh
                        pemilik bisnis dan pelanggan, tanpa menambah beban operasional.
                    </p>
                </article>

                <article className="card-nb p-5">
                    <p className="font-mono text-xs font-bold text-nb-gray uppercase">
                        Misi
                    </p>
                    <h2 className="font-heading text-xl text-nb-black mt-2">
                        Memberdayakan UMKM
                    </h2>
                    <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                        Memberikan alat transaksi yang mudah diadopsi, transparan, dan siap
                        terhubung ke berbagai kebutuhan bisnis melalui dashboard dan API.
                    </p>
                </article>

                <article className="card-nb p-5">
                    <p className="font-mono text-xs font-bold text-nb-gray uppercase">
                        Fokus
                    </p>
                    <h2 className="font-heading text-xl text-nb-black mt-2">
                        Akurasi + Keamanan
                    </h2>
                    <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                        Kami menjaga kualitas data transaksi dengan validasi bukti transfer
                        dan aturan timeout, agar keputusan operasional merchant lebih andal.
                    </p>
                </article>
            </section>

            <section className="mt-8 card-nb p-6">
                <h2 className="font-heading text-2xl text-nb-black">Nilai Inti Tim</h2>
                <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                    Kami berpegang pada empat prinsip ini saat mengembangkan fitur baru,
                    menyusun alur transaksi, dan menerima masukan dari pengguna.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mt-5">
                    {coreValues.map((value) => (
                        <article key={value.title} className="border-2 border-nb-black p-4 bg-white">
                            <h3 className="font-heading text-lg text-nb-black">{value.title}</h3>
                            <p className="font-sans text-sm text-nb-gray mt-1.5 leading-relaxed">
                                {value.detail}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mt-8 card-nb p-6">
                <h2 className="font-heading text-2xl text-nb-black">Perjalanan Produk</h2>
                <p className="font-sans text-sm text-nb-gray mt-2 leading-relaxed">
                    Pengembangan platform berjalan bertahap, dimulai dari riset kebutuhan
                    lapangan hingga penguatan aturan pembayaran di produksi.
                </p>

                <div className="mt-5 space-y-3">
                    {milestones.map((item) => (
                        <article key={item.title} className="border-2 border-nb-black p-4 bg-white">
                            <p className="font-mono text-xs font-bold text-nb-gray uppercase">
                                {item.period}
                            </p>
                            <h3 className="font-heading text-lg text-nb-black mt-1">{item.title}</h3>
                            <p className="font-sans text-sm text-nb-gray mt-1.5 leading-relaxed">
                                {item.detail}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mt-8 card-nb p-6">
                <h2 className="font-heading text-2xl text-nb-black">
                    Komitmen Kami ke Merchant
                </h2>
                <ul className="mt-3 space-y-2 font-sans text-sm text-nb-gray leading-relaxed list-disc pl-5">
                    <li>Memberikan status transaksi yang konsisten dan mudah diaudit.</li>
                    <li>Meningkatkan kecepatan workflow kasir tanpa mengorbankan kontrol.</li>
                    <li>Menyediakan endpoint API publik untuk kebutuhan integrasi eksternal.</li>
                    <li>Menjaga pengalaman dashboard tetap sederhana untuk tim operasional.</li>
                </ul>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/sign-up">
                        <Button variant="black">Mulai Gratis</Button>
                    </Link>
                    <Link href="/help-faq">
                        <Button variant="white">Lihat Help & FAQ</Button>
                    </Link>
                </div>
            </section>
        </main>
    );
}
