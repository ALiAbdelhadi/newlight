/**
 * Helper function to get the correct translation based on locale
 * Falls back to first available translation if no match found
 */
export function getTranslation<T extends { locale: string }>(translations: T[], locale: string): T | undefined {
    return translations.find((t) => t.locale === locale) || translations[0]
}
