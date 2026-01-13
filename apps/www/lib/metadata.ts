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
        en: "New Light Company: Elevate your spaces with exquisite Indoor and outdoor lighting solutions.",
        ar: "شركة نيو لايت: ارتقِ بمساحاتك مع حلول الإضاءة الداخلية والخارجية الراقية.",
    }

    const defaultKeywords = [
        "Lighting", "LED", "Spotlight", "Flood Light", "Spikes", "Bollard", "Poles",
        "إضاءة", "ليد", "كشافات", "أعمدة إنارة", "بولارد"
    ]

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newlight-eg.com"
    const siteName = "New Light Company"
    const ogLocale = locale === "ar" ? "ar_EG" : "en_US"

    const resolvedTitle = title || defaultTitles[locale]
    const resolvedDescription = description || defaultDescriptions[locale]

    const fullUrl = canonicalUrl
        ? `${baseUrl}${canonicalUrl.startsWith('/') ? '' : '/'}${canonicalUrl}`
        : `${baseUrl}/${locale}/`

    // Image is stored in /brand/{locale}/logo-white.png in public folder
    // But with next-intl routing, we need to add locale prefix: /{locale}/brand/{locale}/logo-white.png
    const defaultImagePath = `/brand/${locale}/logo-white.png`

    let resolvedImage: string

    if (image) {
        if (image.startsWith("http")) {
            resolvedImage = image
        }
        else if (image.includes("unsplash") || image.includes("images.")) {
            resolvedImage = image
        }
        else {
            const hasLocale = image.startsWith(`/${locale}/`) ||
                image.startsWith('/ar/') ||
                image.startsWith('/en/')

            if (hasLocale) {
                resolvedImage = `${baseUrl}${image}`
            } else {
                // Add locale prefix for next-intl routing
                resolvedImage = `${baseUrl}/${locale}${image.startsWith('/') ? '' : '/'}${image}`
            }
        }
    } else {
        // Add locale prefix for next-intl routing: /{locale}/brand/{locale}/logo-white.png
        resolvedImage = `${baseUrl}/${locale}${defaultImagePath}`
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
            url: fullUrl,
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
            canonical: fullUrl,
            languages: {
                en: canonicalUrl
                    ? `${baseUrl}${canonicalUrl.replace(/^\/(ar|en)/, '/en')}`
                    : `${baseUrl}/en/`,
                ar: canonicalUrl
                    ? `${baseUrl}${canonicalUrl.replace(/^\/(ar|en)/, '/ar')}`
                    : `${baseUrl}/ar/`,
            },
        },
    }
}