import type { Metadata } from "next";
import { Archivo_Black, Space_Mono, Inter } from "next/font/google";
import "./globals.css";
import SiteFooter from "@/components/common/SiteFooter";
import BackToHomeButton from "@/components/common/BackToHomeButton";
import JsonLd from "@/components/seo/JsonLd";
import {
  SEO_KEYWORDS,
  getMetadataBase,
  getOrganizationJsonLd,
  getSiteUrl,
} from "@/lib/seo";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const siteUrl = getSiteUrl();
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;
const organizationJsonLd = getOrganizationJsonLd();

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "bikinqrisdinamis",
  title: {
    default: "Bikin QRIS Gratis & Dinamis untuk UMKM",
    template: "%s | bikinqrisdinamis",
  },
  description:
    "Bikin QRIS gratis, ubah QRIS static ke QRIS dinamis, dan kelola transaksi UMKM lewat dashboard serta endpoint API QRIS dinamis.",
  keywords: SEO_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: googleSiteVerification
    ? {
      google: googleSiteVerification,
    }
    : undefined,
  openGraph: {
    title: "Bikin QRIS Gratis & Dinamis untuk UMKM",
    description:
      "Platform untuk bikin QRIS dinamis, konversi QRIS static, dan integrasi endpoint API QRIS dinamis.",
    url: siteUrl,
    siteName: "bikinqrisdinamis",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bikin QRIS Gratis & Dinamis untuk UMKM",
    description:
      "Bikin QRIS dinamis cepat, ubah QRIS static, dan pakai endpoint API untuk website kamu.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${archivoBlack.variable} ${spaceMono.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <JsonLd data={organizationJsonLd} />
        <BackToHomeButton />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
