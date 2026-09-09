import { describe, expect, it } from "vitest"
import { decodeSlug, encodeSlug, normalizeArabic, requireSlug, slugify, uniqueSlug } from "../slug"

describe("the A6 normalisation rule", () => {
    it("reduces a hamza-bearing letter to its carrier", () => {
        expect(normalizeArabic("أإآٱ")).toBe("اااا")
        expect(normalizeArabic("ئ")).toBe("ي")
        expect(normalizeArabic("ؤ")).toBe("و")
        expect(normalizeArabic("ى")).toBe("ي")
        expect(normalizeArabic("ة")).toBe("ه")
    })

    it("leaves a bare ء intact, because it has no carrier", () => {
        expect(normalizeArabic("ء")).toBe("ء")
        expect(slugify("إضاءة")).toBe("اضاءه")
    })

    it("produces the approved reference output", () => {
        expect(slugify("إضاءة COB")).toBe("اضاءه-cob")
    })

    it("keeps Latin fragments inline and lowercased, never transliterated", () => {
        expect(slugify("إضاءة Wall Washer")).toBe("اضاءه-wall-washer")
        expect(slugify("شرائط LED")).toBe("شرايط-led")
    })

    it("normalises × to x in the slug only", () => {
        expect(slugify("كشافات 2×120 Cm")).toBe("كشافات-2x120-cm")
    })

    it("trims whitespace, the one place old data is cleaned (A9)", () => {
        expect(slugify("  إضاءة Linear  ")).toBe("اضاءه-linear")
    })

    it("folds Arabic-Indic digits, so a size reads the same in both languages", () => {
        expect(slugify("مقاس ٢٠٠٠ مللي")).toBe("مقاس-2000-مللي")
    })

    it("strips diacritics, which are invisible in a URL", () => {
        expect(slugify("إِضَاءَة")).toBe("اضاءه")
    })
})

describe("percent-encoding round trip (§14.6)", () => {
    const slugs = ["اضاءه-داخليه", "اضاءه-cob", "كشافات-2x120-cm", "ملحقات-الاعواد-الماجناتيك-تراك", "شرايط-led"]

    it("survives encode -> decode unchanged", () => {
        for (const slug of slugs) {
            expect(decodeSlug(encodeSlug(slug))).toBe(slug)
        }
    })

    it("encodes to something a URL can carry", () => {
        const encoded = encodeSlug("اضاءه-داخليه")
        expect(encoded).toMatch(/^[A-Za-z0-9%_.~-]+$/)
        expect(encoded).toContain("%D8")
    })

    it("decodes a malformed escape without throwing, because it is untrusted input", () => {
        expect(decodeSlug("%E0%A4%A")).toBe("%E0%A4%A")
    })
})

describe("refusing to invent a slug", () => {
    it("throws rather than storing an empty string", () => {
        expect(() => requireSlug("!!!", "test")).toThrow()
        expect(() => requireSlug("", "test")).toThrow()
    })

    it("deduplicates deterministically", () => {
        const taken = new Set(["panel", "panel-2"])
        expect(uniqueSlug("Panel", taken, "test")).toBe("panel-3")
        expect(uniqueSlug("Panel", taken, "test")).toBe("panel-3")
    })
})
