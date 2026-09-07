import type { MetadataRoute } from "next"

/**
 * robots.txt. There was none — so nothing told a crawler where the sitemap was, and the
 * checkout flow was as crawlable as the catalog.
 */
export default function robots(): MetadataRoute.Robots {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://newlight-eg.com"

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                // Configure, confirm and complete are per-session states behind an id; they
                // have nothing to index and every one is a duplicate of the product page.
                disallow: ["/api/", "/*/preview/", "/*/confirm/", "/*/complete/", "/*/sign-in", "/*/sign-up", "/*/reset-password"],
            },
        ],
        sitemap: `${base}/sitemap.xml`,
        host: base,
    }
}
