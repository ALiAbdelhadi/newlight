import { DEFAULT_CURRENCY, type Locale, type SerializedMoney } from "@repo/database"

/**
 * Schema.org, for the one reader that never sees the page.
 *
 * The storefront shipped with ZERO structured data. Not a thin implementation — none: no
 * `Product`, no price, no availability, no `BreadcrumbList`, no `Organization`. Everything a
 * search engine needs to show a shop as a shop rather than as a page of text was already in the
 * database and was never expressed in a form a crawler reads, so the rich result a competitor
 * gets for free (price, "in stock", star of a breadcrumb trail) was unavailable to this
 * catalogue by omission.
 *
 * WHAT THIS IS NOT: it is not a second description of the site. Every value here comes from the
 * same row the visible page renders — the price is the discounted price the buy button will
 * charge, availability is the stock ledger the "In stock" line reads. A structured-data block
 * that can disagree with the page is worse than none, because that is what a manual penalty is
 * for.
 *
 * All of it is server-rendered. None of it needs the client, and a crawler that does not run
 * JavaScript is exactly the reader this exists for.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://newlight-eg.com"

/** An absolute URL, which is what schema.org requires — a relative `url` is silently dropped. */
export function absoluteUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type Thing = { [key: string]: JsonValue | undefined }

/**
 * `</script>` inside a JSON string ends the block early and the rest of the document becomes
 * markup — so the two characters that can do it are escaped. They are still valid JSON: `\u003c`
 * parses back to `<`. This is the whole reason the serialisation is not `JSON.stringify` alone.
 */
function serialise(data: Thing): string {
    return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
}

/** Drops undefined keys, so an optional field is absent rather than `null`. */
function clean(data: Thing): Thing {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Thing
}

export function JsonLd({ data }: { data: Thing | Thing[] }) {
    const payload = Array.isArray(data)
        ? { "@context": "https://schema.org", "@graph": data.map(clean) as JsonValue }
        : { "@context": "https://schema.org", ...clean(data) }

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialise(payload) }} />
}

/* --------------------------------------------------------------------- site */

const PHONE = "+201066076077"
const SOCIAL = ["https://www.facebook.com/share/17vq5UgeWM/", "https://www.instagram.com/newl_ight0/"]

/**
 * Who we are. Emitted once, in the storefront layout.
 *
 * The address is the one on the contact page, and the phone is the number that page dials —
 * repeated here rather than paraphrased, because a mismatch between the two is what stops a
 * knowledge panel from resolving.
 */
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

/**
 * The site, and the fact that it has a search.
 *
 * `SearchAction` is worth the six lines: it is what lets a result carry its own search box, and
 * it points at the real `/search?q=` route rather than an endpoint invented for the crawler.
 */
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

/* -------------------------------------------------------------- breadcrumbs */

export interface Crumb {
    name: string
    /** Locale-prefixed path. Made absolute here. */
    path: string
}

/**
 * The trail, which the product page already draws for people.
 *
 * Google renders this in place of the raw URL under a result, so a page that has a visible
 * breadcrumb and no `BreadcrumbList` is doing the work and not getting the benefit.
 */
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

/* ----------------------------------------------------------------- product */

export interface ProductSchemaInput {
    name: string
    description?: string | null
    sku: string
    images: string[]
    url: string
    /** What the customer pays — the discounted price where a discount is live (§13.2). */
    price: SerializedMoney
    inStock: boolean
    category?: string
    /** Rendered as `additionalProperty`, from the same rows the spec table shows. */
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
            /*
             * A STRING, and deliberately. schema.org wants a plain decimal, and `price` is
             * already exactly that — routing it through `Number()` to satisfy a type would be
             * the float arithmetic ADR 0001 exists to prevent, on the one number a search
             * engine will quote back to a customer.
             */
            price: input.price,
            priceCurrency: DEFAULT_CURRENCY,
            availability: input.inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            // COD is the only method the order model has (`PaymentMethod`), so this is a fact
            // about the shop rather than a hopeful list of logos.
            acceptedPaymentMethod: {
                "@type": "PaymentMethod",
                name: "http://purl.org/goodrelations/v1#COD",
            },
            seller: { "@id": `${SITE_URL}/#organization` },
        },
    }
}

/* -------------------------------------------------------------- item lists */

export interface ListEntry {
    name: string
    path: string
}

/**
 * An ordered list of links, for a listing page.
 *
 * Carries names and URLs only, not prices. A full `Product` per tile would repeat, on every
 * listing, the block the product page already owns — and every repetition is another place the
 * price can go stale.
 */
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
