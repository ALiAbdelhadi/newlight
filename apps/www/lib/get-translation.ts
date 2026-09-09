import { pickTranslation, requireTranslation, translationFallback, type Locale } from "@repo/database"

export { pickTranslation, requireTranslation, translationFallback }

export function getTranslation<T extends { locale: string }>(translations: T[], locale: Locale): T | undefined {
    const picked = pickTranslation(translations, locale)
    if (picked && picked.locale !== locale) {
        console.warn(`[i18n] no ${locale} translation; fell back to ${picked.locale}`)
    }
    return picked
}
