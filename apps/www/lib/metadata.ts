import { SupportedLanguage } from "@/types"
import { Metadata } from "next/types"

export function constructMetadata({
    title,
    description,
    locale = "en",
    image = locale === "ar" ? "/brand/ar/logo-white.png" : "/brand/en/logo-white.png",
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
        en: "New light Company - Professional lighting: Shop Spotlights, Light Poles, and LED Lights",
        ar: "شركة نيو لايت - حلول إضاءة احترافية: كشافات، أعمدة إنارة، ولمبات ليد",
    }

    const defaultDescriptions: Record<SupportedLanguage, string> = {
        en: "New light Company: Elevate your spaces with exquisite Indoor and outdoor lighting solutions. Explore our curated selection of spotlights, light poles, LED fixtures, linear lighting, and bollards, meticulously crafted for enduring brilliance and energy efficiency. Experience the New light difference – exceptional illumination at exceptional value.",
        ar: "شركة نيو لايت: ارتقِ بمساحاتك مع حلول الإضاءة الداخلية والخارجية الراقية. استكشف تشكيلتنا المختارة من الكشافات، أعمدة الإنارة، تجهيزات ليد، الثريات، الإضاءات الخطية، والبولارد — مصممة بعناية للحصول على سطوع دائم وكفاءة في استهلاك الطاقة. اكتشف فرق نيو لايت — إضاءة استثنائية بقيمة استثنائية.",
    }

    const defaultKeywords = [
        "Lighting",
        "LED",
        "Spotlight",
        "Flood Light",
        "Spikes",
        "Bollard",
        "Poles",
        "إضاءة عامة",
        "إضاءة وظيفية",
        "إضاءة زخرفية",
        "إضاءة طوارئ",
        "إضاءة غرفة نوم",
        "إضاءة معيشة",
        "إضاءة مطبخ",
        "إضاءة حمام",
        "إضاءة مدخل",
        "إضاءة متاجر",
        "إضاءة مكاتب",
        "إضاءة مطاعم",
        "إضاءة فنادق",
        "إضاءة مصانع",
        "إضاءة مخازن",
        "إضاءة ورش عمل",
        "إضاءة حدائق",
        "إضاءة واجهات",
        "إضاءة ملاعب",
        "إضاءة شوارع",
        "لمبات LED",
        "لمبات فلورسنت",
        "لمبات هالوجين",
        "لمبات زئبق",
        "لمبات صوديوم",
        "إضاءة مباشرة",
        "إضاءة غير مباشرة",
        "إضاءة موجهة",
        "ثريات حديد",
        "ثريات نحاس",
        "ديمر",
        "فلتر",
        "رفلكتور",
        "تصميم الإضاءة",
        "تركيب الإضاءة",
    ]

    const baseUrl = "https://newlight-eg.vercel.app"
    const siteName = "New light Company"
    const ogLocale = locale === "ar" ? "ar_EG" : "en_US"

    const resolvedTitle = title || defaultTitles[locale]
    const resolvedDescription = description || defaultDescriptions[locale]
    const siteUrl = canonicalUrl || `${baseUrl}/${locale}/`

    const defaultImage = locale === "ar" ? "/brand/ar/logo-white.png" : "/brand/en/logo-white.png"
    const imageToUse = image || defaultImage
    const resolvedImage = imageToUse.startsWith("http") ? imageToUse : `${baseUrl}${imageToUse}`
    const imageAlt = locale === "ar" ? "شعار شركة نيو لايت" : "New light Company Logo"

    const allKeywords = keywords
        ? [...defaultKeywords, ...keywords.split(",").map(k => k.trim())]
        : defaultKeywords

    return {
        title: resolvedTitle,
        description: resolvedDescription,
        keywords: allKeywords,

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

        other: {
            "application-name": siteName,
            "og:image": resolvedImage,
            "og:image:width": "1200",
            "og:image:height": "630",
            "og:image:alt": imageAlt,
            "twitter:image": resolvedImage,
            "twitter:image:alt": imageAlt,
        },
        icons,
        metadataBase: new URL(baseUrl),

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