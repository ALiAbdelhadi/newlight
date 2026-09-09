import { encodeSlug } from "@repo/database"

type CanonicalUrlParams = {
    locale: string
    segments: string[]
}

export function createCanonicalUrl({ locale, segments }: CanonicalUrlParams): string {
    // Arabic slugs are stored, and linked to, as raw text (encodeSlug/encodeURIComponent only
    // at the point a URL is built) — the same rule applies here, or the canonical tag and the
    // hreflang alternates end up with an unencoded Arabic path while every <Link> on the page
    // uses the encoded one, which reads as two different URLs to a crawler.
    const cleanSegments = segments
        .filter(Boolean)
        .map((s) => encodeSlug(s.replace(/^\/|\/$/g, "")))
        .filter(Boolean)

    return `/${locale}/${cleanSegments.join("/")}`
}

export function createProductCanonicalUrl(params: {
    locale: string
    categorySlug: string
    subCategorySlug: string
    productId: string
}): string {
    return createCanonicalUrl({
        locale: params.locale,
        segments: ['category', params.categorySlug, params.subCategorySlug, params.productId]
    })
}

export function createSubCategoryCanonicalUrl(params: {
    locale: string
    categorySlug: string
    subCategorySlug: string
}): string {
    return createCanonicalUrl({
        locale: params.locale,
        segments: ['category', params.categorySlug, params.subCategorySlug]
    })
}

export function createCategoryCanonicalUrl(params: {
    locale: string
    categorySlug: string
}): string {
    return createCanonicalUrl({
        locale: params.locale,
        segments: ['category', params.categorySlug]
    })
}

export function createPageCanonicalUrl(params: {
    locale: string
    path: string
}): string {
    return createCanonicalUrl({
        locale: params.locale,
        segments: [params.path]
    })
}
