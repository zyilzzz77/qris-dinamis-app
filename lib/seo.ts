const FALLBACK_SITE_URL = "http://localhost:3000";

export const SEO_KEYWORDS = [
    "bikin qris gratis",
    "bikin qris dinamis",
    "cara ubah qris static jadi qris dinamis",
    "cara ubah qris statis jadi qris dinamis",
    "convert qris static ke qris dinamis",
    "endpoint bikin qris dinamis",
    "api qris dinamis",
    "generator qris dinamis",
    "qris untuk umkm",
    "qris nominal custom",
    "konversi qris statis",
];

export type FaqItem = {
    question: string;
    answer: string;
};

export function getSiteUrl(): string {
    const rawSiteUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXTAUTH_URL ??
        FALLBACK_SITE_URL;

    try {
        return new URL(rawSiteUrl).origin;
    } catch {
        return FALLBACK_SITE_URL;
    }
}

function sanitizeHost(rawHost: string): string {
    return rawHost.split(",")[0].trim();
}

function sanitizeProto(rawProto: string): string {
    return rawProto.split(",")[0].trim().replace(/:$/, "");
}

function resolveOriginFromRequest(request: Request): string | null {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
        const forwardedProto = request.headers.get("x-forwarded-proto");
        const host = sanitizeHost(forwardedHost);
        const proto = forwardedProto ? sanitizeProto(forwardedProto) : "https";
        return `${proto}://${host}`;
    }

    const host = request.headers.get("host");
    if (host) {
        const forwardedProto = request.headers.get("x-forwarded-proto");
        if (forwardedProto) {
            return `${sanitizeProto(forwardedProto)}://${sanitizeHost(host)}`;
        }

        const guessedProto = host.includes("localhost") ? "http" : "https";
        return `${guessedProto}://${sanitizeHost(host)}`;
    }

    try {
        return new URL(request.url).origin;
    } catch {
        return null;
    }
}

export function getRequestOrigin(request: Request): string {
    const configuredSiteUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXTAUTH_URL;

    const requestOrigin = resolveOriginFromRequest(request);

    if (process.env.NODE_ENV !== "production" && requestOrigin) {
        return requestOrigin;
    }

    if (configuredSiteUrl) {
        try {
            return new URL(configuredSiteUrl).origin;
        } catch {
            // Ignore malformed env and continue with header-based origin.
        }
    }

    if (requestOrigin) {
        return requestOrigin;
    }

    return getSiteUrl();
}

export function getMetadataBase(): URL {
    return new URL(getSiteUrl());
}

export function toAbsoluteUrl(pathname: string): string {
    return new URL(pathname, getSiteUrl()).toString();
}

export function toAbsoluteUrlFromRequest(pathname: string, request: Request): string {
    return new URL(pathname, getRequestOrigin(request)).toString();
}

export function getOrganizationJsonLd(): Record<string, unknown> {
    const siteUrl = getSiteUrl();

    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "bikinqrisdinamis",
        url: siteUrl,
        description:
            "Platform untuk bikin QRIS gratis, konversi QRIS static ke QRIS dinamis, dan integrasi endpoint API QRIS dinamis.",
        areaServed: "ID",
        knowsAbout: SEO_KEYWORDS,
        contactPoint: [
            {
                "@type": "ContactPoint",
                contactType: "customer support",
                url: toAbsoluteUrl("/help-faq"),
                availableLanguage: ["id"],
            },
        ],
    };
}

export function getFaqJsonLd(items: FaqItem[]): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        })),
    };
}
