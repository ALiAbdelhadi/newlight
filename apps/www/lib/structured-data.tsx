import { DEFAULT_CURRENCY, type Locale, type SerializedMoney } from "@repo/database"

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://newlight-eg.com"

export function absoluteUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type Thing = { [key: string]: JsonValue | undefined }

function serialise(data: Thing): string {
    return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
}

function clean(data: Thing): Thing {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Thing
}

export function JsonLd({ data }: { data: Thing | Thing[] }) {
    const payload = Array.isArray(data)
        ? { "@context": "https://schema.org", "@graph": data.map(clean) as JsonValue }
        : { "@context": "https://schema.org", ...clean(data) }

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialise(payload) }} />
}

const PHONE = "+201066076077"
const SOCIAL = ["https://www.facebook.com/share/17vq5UgeWM/", "https://www.instagram.com/newl_ight0/"]

export function organisationSchema(locale: Locale): Thing {
    return {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: locale === "ar" ? "شركة نيو لايت" : "New Light Company",
        url: `${SITE_URL}/${locale}`,
        logo: absoluteUrl("/web-app-manifest-512x512.png"),
        telephone: PHONE,
        email: "mostafa@newlight-eg.com",
        sameAs: SOCIAL,
        address: {
            "@type": "PostalAddress",
            streetAddress: "86 Abbas El-Akkad, Al Manteqah Al Oula",
            addressLocality: "Nasr City",
            addressRegion: "Cairo",
            addressCountry: "EG",
        },
    }
}

export function webSiteSchema(locale: Locale): Thing {
    return {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/${locale}`,
        name: locale === "ar" ? "شركة نيو لايت" : "New Light Company",
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE_URL}/${locale}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    }
}

export interface Crumb {
    name: string
    path: string
}

export function breadcrumbSchema(crumbs: Crumb[]): Thing {
    return {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: absoluteUrl(crumb.path),
        })),
    }
}

export interface ProductSchemaInput {
    name: string
    description?: string | null
    sku: string
    images: string[]
    url: string
    price: SerializedMoney
    inStock: boolean
    category?: string
    specs?: Array<{ label: string; value: string }>
}

export function productSchema(input: ProductSchemaInput, locale: Locale): Thing {
    const url = absoluteUrl(input.url)

    return {
        "@type": "Product",
        name: input.name,
        description: input.description ?? undefined,
        sku: input.sku,
        mpn: input.sku,
        image: input.images.map(absoluteUrl),
        url,
        category: input.category,
        inLanguage: locale,
        brand: { "@type": "Brand", name: "New Light" },
        additionalProperty: input.specs?.length
            ? input.specs.map((spec) => ({
                  "@type": "PropertyValue",
                  name: spec.label,
                  value: spec.value,
              }))
            : undefined,
        offers: {
            "@type": "Offer",
            url,
            price: input.price,
            priceCurrency: DEFAULT_CURRENCY,
            availability: input.inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            acceptedPaymentMethod: {
                "@type": "PaymentMethod",
                name: "http://purl.org/goodrelations/v1#COD",
            },
            seller: { "@id": `${SITE_URL}/#organization` },
        },
    }
}

export interface ListEntry {
    name: string
    path: string
}

export function itemListSchema(entries: ListEntry[], name?: string): Thing {
    return {
        "@type": "ItemList",
        name,
        numberOfItems: entries.length,
        itemListElement: entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.name,
            url: absoluteUrl(entry.path),
        })),
    }
}
