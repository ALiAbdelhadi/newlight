import { pickTranslation, requireTranslation, translationFallback, type Locale } from "@repo/database"

/**
 * §14.2: the silent fallback is gone.
 *
 * This used to be `translations.find(t => t.locale === locale) || translations[0]` — which
 * meant a missing Arabic name rendered the English one, indistinguishably, forever. Nobody
 * could tell a translated catalog from an untranslated one by looking at it.
 *
 * The replacement makes the decision EXPLICIT at the call site:
 *   - `pickTranslation`     falls back, and `translationFallback` says whether it did, so a
 *                           page can mark the element `lang="en"` instead of pretending.
 *   - `requireTranslation`  throws, for places where a missing translation is a data defect
 *                           rather than a display case — a checkout snapshot, an invoice.
 *
 * All three live in @repo/database so the admin app answers the same way.
 */
export { pickTranslation, requireTranslation, translationFallback }

/**
 * @deprecated Use `pickTranslation` and, where it matters, `translationFallback` beside it.
 * Kept as a thin alias so the remaining call sites keep compiling; it now LOGS when it falls
 * back, which is the whole difference.
 */
export function getTranslation<T extends { locale: string }>(translations: T[], locale: Locale): T | undefined {
    const picked = pickTranslation(translations, locale)
    if (picked && picked.locale !== locale) {
        console.warn(`[i18n] no ${locale} translation; fell back to ${picked.locale}`)
    }
    return picked
}
