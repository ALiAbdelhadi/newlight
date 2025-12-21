import { SupportedLanguage } from "@/types"
import { Metadata } from "next/types"

export function constructMetadata({
    title,
    description,
    locale = "en",
    image,
    icons = "/favicon.ico",
    openGraph,
    twitter,
    keywords,
    noIndex = false,
    canonicalUrl,
}: {
    title?: string
    description?: string
    locale?: SupportedLanguage
    image?: string
    icons?: string
    openGraph?: Metadata["openGraph"]
    twitter?: Metadata["twitter"]
    keywords?: string
    noIndex?: boolean
    canonicalUrl?: string
} = {}): Metadata {
    const defaultTitles: Record<SupportedLanguage, string> = {
        en: "New Light Company - Professional Lighting Solutions",
        ar: "شركة نيو لايت - حلول إضاءة احترافية",
    }

    const defaultDescriptions: Record<SupportedLanguage, string> = {
        en: "New Light Company: Elevate your spaces with exquisite Indoor and outdoor lighting solutions. Explore our curated selection of spotlights, light poles, LED fixtures, and more.",
        ar: "شركة نيو لايت: ارتقِ بمساحاتك مع حلول الإضاءة الداخلية والخارجية الراقية. استكشف تشكيلتنا المختارة من الكشافات وأعمدة الإنارة.",
    }

    const defaultKeywords = [
        "Lighting", "LED", "Spotlight", "Flood Light", "Spikes", "Bollard", "Poles",
        "إضاءة", "ليد", "كشافات", "أعمدة إنارة", "بولارد"
    ]
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newlight-eg.vercel.app"
    const siteName = "New Light Company"
    const ogLocale = locale === "ar" ? "ar_EG" : "en_US"

    const resolvedTitle = title || defaultTitles[locale]
    const resolvedDescription = description || defaultDescriptions[locale]
    const siteUrl = canonicalUrl || `${baseUrl}/${locale}/`

    const defaultImage = locale === "ar"
        ? `${baseUrl}/brand/ar/logo-white.png`
        : `${baseUrl}/brand/en/logo-white.png`

    let resolvedImage: string
    if (image) {
        resolvedImage = image.startsWith("http") ? image : `${baseUrl}${image}`
    } else {
        resolvedImage = defaultImage
    }

    const imageAlt = locale === "ar" ? "شعار شركة نيو لايت" : "New Light Company Logo"

    const allKeywords = keywords
        ? [...defaultKeywords, ...keywords.split(",").map(k => k.trim())]
        : defaultKeywords

    return {
        title: resolvedTitle,
        description: resolvedDescription,
        keywords: allKeywords,

        metadataBase: new URL(baseUrl),

        openGraph: openGraph ?? {
            type: "website",
            locale: ogLocale,
            url: siteUrl,
            siteName,
            title: resolvedTitle,
            description: resolvedDescription,
            images: [
                {
                    url: resolvedImage,
                    width: 1200,
                    height: 630,
                    alt: imageAlt,
                    type: "image/png"
                },
            ],
        },

        twitter: twitter ?? {
            card: "summary_large_image",
            site: "@NewlightEG",
            creator: "@NewlightEG",
            title: resolvedTitle,
            description: resolvedDescription,
            images: {
                url: resolvedImage, 
                alt: imageAlt,
            },
        },

        icons,

        robots: {
            index: !noIndex,
            follow: !noIndex,
            googleBot: {
                index: !noIndex,
                follow: !noIndex,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },

        alternates: {
            canonical: siteUrl,
            languages: {
                en: `${baseUrl}/en/`,
                ar: `${baseUrl}/ar/`,
            },
        },
    }
}