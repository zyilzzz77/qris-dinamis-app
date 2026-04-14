import Link from "next/link";

export default function NotFoundPage() {
    return (
        <main className="min-h-screen bg-nb-yellow pattern-dots flex items-center justify-center p-4">
            <section className="w-full max-w-2xl card-nb p-6 sm:p-8">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-nb-gray">
                    Error 404
                </p>

                <h1 className="font-heading text-5xl sm:text-6xl text-nb-black leading-none mt-2">
                    Halaman
                    <br />
                    Tidak Ditemukan
                </h1>

                <p className="font-sans text-sm sm:text-base text-nb-gray mt-4 max-w-xl">
                    URL yang kamu akses tidak tersedia atau sudah dipindahkan. Cek kembali link
                    yang kamu buka, atau kembali ke halaman utama.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Link href="/" className="btn-nb btn-nb-black">
                        Kembali ke Beranda
                    </Link>
                    <Link href="/dashboard" className="btn-nb btn-nb-white">
                        Buka Dashboard
                    </Link>
                </div>

                <div
                    className="mt-6 p-3"
                    style={{
                        border: "2px solid #0D0D0D",
                        backgroundColor: "#FFFBF0",
                    }}
                >
                    <p className="font-mono text-xs text-nb-black font-bold">
                        Masih butuh bantuan? Kirim laporan dari halaman support.
                    </p>
                    <Link
                        href="/support"
                        className="inline-block mt-2 font-mono text-xs font-bold text-nb-blue underline underline-offset-2"
                    >
                        Buka Support
                    </Link>
                </div>
            </section>
        </main>
    );
}
