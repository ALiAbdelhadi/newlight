/**
 * Translated rows.
 *
 * Category, SubCategory, ProductFamily and Product all keep their text in a `*Translation`
 * side table, one row per locale. Reading one correctly means filtering by locale — and the
 * audit found eight places that did not:
 *
 *     translations: { take: 1 }            // returns an arbitrary language
 *     translations: { where: { locale: "en" } }  // hard-coded, ignores the caller
 *
 * Both are the same bug: the locale is a parameter of the request, and code that does not
 * pass it renders Arabic to English readers roughly half the time. This module exists so
 * that spelling the include correctly is easier than spelling it wrongly.
 */
import { DEFAULT_LOCALE, type Locale, otherLocale } from "./locale"

/** The shape every translation row shares. */
export interface Translated {
    locale: string
}

/**
 * The Prisma include for "the translation for this request".
 *
 *     include: { translations: translationsFor(locale) }
 *
 * `take: 1` is safe here ONLY because it is paired with the where clause; the unique
 * constraint on (entityId, locale) means at most one row can match anyway.
 */
export function translationsFor(locale: Locale) {
    // Deliberately NOT `as const`: a readonly object is rejected by Prisma's generated
    // include types, and this exists to be dropped straight into one.
    return { where: { locale }, take: 1 }
}

/**
 * The include for "both languages", for admin editors and for pages that need the other
 * language's slug to build an hreflang link. Ordered so the result is stable.
 */
export function allTranslations() {
    return { orderBy: { locale: "asc" as const } }
}

/**
 * Pick the row for a locale from a set that may hold one or both.
 *
 * Falls back to the other locale, then to whatever exists. A product with only an Arabic
 * name should render its Arabic name to an English reader rather than an empty heading —
 * but the fallback is reported by translationFallback() so a page can mark it (lang
 * attributes matter to screen readers and to search engines) instead of pretending.
 */
export function pickTranslation<T extends Translated>(
    rows: readonly T[] | null | undefined,
    locale: Locale
): T | undefined {
    if (!rows?.length) return undefined
    return (
        rows.find((row) => row.locale === locale) ??
        rows.find((row) => row.locale === otherLocale(locale)) ??
        rows.find((row) => row.locale === DEFAULT_LOCALE) ??
        rows[0]
    )
}

/** Which locale the picked row actually is, or undefined when there was nothing to pick. */
export function translationFallback<T extends Translated>(
    rows: readonly T[] | null | undefined,
    locale: Locale
): { locale: string; isFallback: boolean } | undefined {
    const row = pickTranslation(rows, locale)
    if (!row) return undefined
    return { locale: row.locale, isFallback: row.locale !== locale }
}

/**
 * For call sites where a missing translation is a data defect rather than a display case —
 * a checkout snapshot, an order confirmation email, an invoice.
 */
export function requireTranslation<T extends Translated>(
    rows: readonly T[] | null | undefined,
    locale: Locale,
    context: string
): T {
    const row = pickTranslation(rows, locale)
    if (!row) {
        throw new Error(`requireTranslation(): no translation in any locale for ${context}`)
    }
    return row
}
