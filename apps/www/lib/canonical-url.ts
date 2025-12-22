type CanonicalUrlParams = {
    locale: string
    segments: string[]
}

export function createCanonicalUrl({ locale, segments }: CanonicalUrlParams): string {
    const cleanSegments = segments
        .filter(Boolean) 
        .map(s => s.replace(/^\/|\/$/g, ''))
        .filter(Boolean)

    return `/${locale}/${cleanSegments.join('/')}`
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