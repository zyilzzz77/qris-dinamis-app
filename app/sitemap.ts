import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    return [
        {
            url: toAbsoluteUrl("/"),
            lastModified,
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: toAbsoluteUrl("/help-faq"),
            lastModified,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: toAbsoluteUrl("/about-us"),
            lastModified,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: toAbsoluteUrl("/blog-updates"),
            lastModified,
            changeFrequency: "weekly",
            priority: 0.75,
        },
        {
            url: toAbsoluteUrl("/privacy-notice"),
            lastModified,
            changeFrequency: "yearly",
            priority: 0.55,
        },
        {
            url: toAbsoluteUrl("/terms-conditions"),
            lastModified,
            changeFrequency: "yearly",
            priority: 0.55,
        },
        {
            url: toAbsoluteUrl("/dmca-disclaimer"),
            lastModified,
            changeFrequency: "yearly",
            priority: 0.5,
        },
    ];
}
