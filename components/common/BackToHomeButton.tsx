"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";

const legalPages = new Set([
    "/help-faq",
    "/privacy-notice",
    "/terms-conditions",
    "/dmca-disclaimer",
    "/about-us",
    "/blog-updates",
]);

export default function BackToHomeButton() {
    const pathname = usePathname();

    if (!pathname || !legalPages.has(pathname)) {
        return null;
    }

    return (
        <div className="fixed left-4 bottom-4 z-40 sm:left-6 sm:bottom-6">
            <Link href="/dashboard">
                <Button variant="white" size="sm" aria-label="Kembali ke dashboard">
                    ← Kembali ke Dashboard
                </Button>
            </Link>
        </div>
    );
}
