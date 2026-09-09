import { DEFAULT_LOCALE, type Locale, otherLocale } from "./locale"

export interface Translated {
    locale: string
}

export function translationsFor(locale: Locale) {
    return { where: { locale }, take: 1 }
}

export function allTranslations() {
    return { orderBy: { locale: "asc" as const } }
}

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

export function translationFallback<T extends Translated>(
    rows: readonly T[] | null | undefined,
    locale: Locale
): { locale: string; isFallback: boolean } | undefined {
    const row = pickTranslation(rows, locale)
    if (!row) return undefined
    return { locale: row.locale, isFallback: row.locale !== locale }
}

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
