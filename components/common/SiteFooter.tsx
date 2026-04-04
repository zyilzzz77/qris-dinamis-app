import Link from "next/link";

const footerLinks = [
    { href: "/help-faq", label: "Help & FAQ" },
    { href: "/privacy-notice", label: "Privacy Notice" },
    { href: "/terms-conditions", label: "Terms & Conditions" },
    { href: "/dmca-disclaimer", label: "DMCA Disclaimer" },
    { href: "/about-us", label: "About Us" },
    { href: "/blog-updates", label: "Blog & Updates" },
];

export default function SiteFooter() {
    return (
        <footer className="border-t-2 border-nb-black bg-white mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="font-heading text-xl text-nb-black">bikinqrisdinamis</p>
                        <p className="font-sans text-sm text-nb-gray mt-2 max-w-xl">
                            Solusi QRIS dinamis untuk UMKM Indonesia. Semua halaman legal dan
                            informasi penting tersedia di bawah ini.
                        </p>
                    </div>

                    <nav aria-label="Footer legal links">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            {footerLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="font-mono text-xs font-bold tracking-wide text-nb-black hover:text-nb-blue transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <div className="border-t-2 border-nb-black mt-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="font-mono text-xs text-nb-gray">
                        © 2026 bikinqrisdinamis. All rights reserved.
                    </p>
                    <p className="font-mono text-xs text-nb-gray">
                        QRIS adalah produk Bank Indonesia & ASPI.
                    </p>
                </div>
            </div>
        </footer>
    );
}
