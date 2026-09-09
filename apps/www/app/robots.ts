import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://newlight-eg.com"

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/*/preview/", "/*/confirm/", "/*/complete/", "/*/sign-in", "/*/sign-up", "/*/reset-password"],
            },
        ],
        sitemap: `${base}/sitemap.xml`,
        host: base,
    }
}
