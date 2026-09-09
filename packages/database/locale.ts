export const LOCALES = ["en", "ar"] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "ar"

const RTL_LOCALES = new Set<Locale>(["ar"])

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

export function resolveLocale(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
    if (isLocale(value)) return value
    if (typeof value === "string") {
        const base = value.toLowerCase().split(/[-_]/)[0]
        if (isLocale(base)) return base
    }
    return fallback
}

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

export function otherLocale(locale: Locale): Locale {
    return locale === "ar" ? "en" : "ar"
}

export function intlLocale(locale: Locale): string {
    return locale === "ar" ? "ar-EG" : "en-US"
}

export function numericLocale(locale: Locale): string {
    return locale === "ar" ? "ar-EG-u-nu-arab" : "en-US"
}
