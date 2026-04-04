import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import SeoContent from "@/components/landing/SeoContent";
import { SEO_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Bikin QRIS Gratis dan QRIS Dinamis",
  description:
    "Bikin QRIS gratis untuk UMKM, ubah QRIS static jadi QRIS dinamis, dan gunakan endpoint API bikin QRIS dinamis untuk website kamu.",
  keywords: [
    ...SEO_KEYWORDS,
    "cara ubah qris static jadi qris dinamis",
    "endpoint bikin qris dinamis",
    "api bikin qris dinamis",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bikin QRIS Gratis dan QRIS Dinamis",
    description:
      "Platform untuk konversi QRIS static ke QRIS dinamis dengan nominal custom dan endpoint API.",
    url: "/",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <SeoContent />
    </main>
  );
}
