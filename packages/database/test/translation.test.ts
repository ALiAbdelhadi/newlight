import { describe, expect, it } from "vitest"
import { isLocale, localeDirection, otherLocale, requireLocale, resolveLocale } from "../locale"
import { pickTranslation, requireTranslation, translationFallback, translationsFor } from "../translation"

const rows = [
    { locale: "en", name: "Panel Lights" },
    { locale: "ar", name: "بانل لايت" },
]

describe("translation selection", () => {
    it("returns the requested locale", () => {
        expect(pickTranslation(rows, "ar")?.name).toBe("بانل لايت")
        expect(pickTranslation(rows, "en")?.name).toBe("Panel Lights")
    })

    it("falls back, and SAYS SO", () => {
        const englishOnly = [{ locale: "en", name: "Panel Lights" }]
        expect(pickTranslation(englishOnly, "ar")?.name).toBe("Panel Lights")
        expect(translationFallback(englishOnly, "ar")).toEqual({ locale: "en", isFallback: true })
        expect(translationFallback(rows, "ar")).toEqual({ locale: "ar", isFallback: false })
    })

    it("returns undefined for nothing, rather than an empty-shaped object", () => {
        expect(pickTranslation([], "ar")).toBeUndefined()
        expect(pickTranslation(null, "ar")).toBeUndefined()
        expect(translationFallback([], "ar")).toBeUndefined()
    })

    it("throws where a missing translation is a data defect, not a display case", () => {
        expect(() => requireTranslation([], "ar", "order snapshot")).toThrow(/order snapshot/)
        expect(requireTranslation(rows, "ar", "x").name).toBe("بانل لايت")
    })

    it("builds an include that cannot forget the locale (§14.4)", () => {
        expect(translationsFor("ar")).toEqual({ where: { locale: "ar" }, take: 1 })
    })
})

describe("locale", () => {
    it("accepts only the two that exist", () => {
        expect(isLocale("en")).toBe(true)
        expect(isLocale("ar")).toBe(true)
        expect(isLocale("fr")).toBe(false)
        expect(isLocale(undefined)).toBe(false)
    })

    it("resolves region-tagged and unknown input without throwing", () => {
        expect(resolveLocale("ar-EG")).toBe("ar")
        expect(resolveLocale("en_US")).toBe("en")
        expect(resolveLocale("fr")).toBe("ar")
        expect(resolveLocale(undefined)).toBe("ar")
    })

    it("throws where a wrong answer is worse than an error", () => {
        expect(() => requireLocale("fr")).toThrow(TypeError)
    })

    it("knows Arabic is right-to-left", () => {
        expect(localeDirection("ar")).toBe("rtl")
        expect(localeDirection("en")).toBe("ltr")
        expect(otherLocale("ar")).toBe("en")
    })
})
