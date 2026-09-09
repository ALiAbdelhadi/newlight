/**
 * Locale.
 *
 * The storefront is bilingual and the two languages are not interchangeable: Arabic is RTL,
 * has its own slugs (migration 0002), its own spec labels (0006) and its own product names.
 * A locale that is a bare `string` is one typo away from serving Arabic content on an
 * English path, and the audit found eight queries that fetched a translation with
 * `take: 1` and NO locale filter — each of which returns whichever row PostgreSQL felt like.
 *
 * This module is the only place a locale is validated, so "is this a locale" has one answer.
 * Query construction lives in translation.ts, which is built on top of it.
 */

export const LOCALES = ["en", "ar"] as const

export type Locale = (typeof LOCALES)[number]

/** Arabic. The market is Egyptian; English is the secondary reading. */
export const DEFAULT_LOCALE: Locale = "ar"

const RTL_LOCALES = new Set<Locale>(["ar"])

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

/**
 * For untrusted input — a route segment, a header, a stored preference. Unknown input
 * becomes DEFAULT_LOCALE rather than throwing, because a bad URL should render a page.
 * Use requireLocale where a wrong answer would be worse than an error.
 */
export function resolveLocale(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
    if (isLocale(value)) return value
    if (typeof value === "string") {
        // Accept region-tagged forms: ar-EG, en-GB, en_US.
        const base = value.toLowerCase().split(/[-_]/)[0]
        if (isLocale(base)) return base
    }
    return fallback
}

/** For internal call sites, where an unknown locale is a programming error. */
export function requireLocale(value: unknown): Locale {
    if (!isLocale(value)) {
        throw new TypeError(`requireLocale(): ${JSON.stringify(value)} is not one of ${LOCALES.join(", ")}`)
    }
    return value
}

export function isRtl(locale: Locale): boolean {
    return RTL_LOCALES.has(locale)
}

export function localeDirection(locale: Locale): "rtl" | "ltr" {
    return isRtl(locale) ? "rtl" : "ltr"
}

/** The other locale. With exactly two, "the other one" is well defined and worth naming. */
export function otherLocale(locale: Locale): Locale {
    return locale === "ar" ? "en" : "ar"
}

/**
 * The BCP 47 tag to hand to Intl. `ar` alone formats with Arabic-Indic digits in some
 * runtimes and Latin digits in others; `ar-EG` is the market and pins the behaviour.
 */
export function intlLocale(locale: Locale): string {
    return locale === "ar" ? "ar-EG" : "en-US"
}

/**
 * The tag for any number or date that appears BESIDE a price.
 *
 * `money.ts` pins `-u-nu-arab` because Arabic prices are written in Arabic-Indic digits, and a
 * page that formats its prices that way and its percentages with plain `ar` renders "١٦٥ ج.م"
 * next to "20%" — two digit systems on one card. Anything numeric that shares a surface with
 * money resolves its locale here.
 */
export function numericLocale(locale: Locale): string {
    return locale === "ar" ? "ar-EG-u-nu-arab" : "en-US"
}
