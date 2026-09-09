import { describe, expect, it } from "vitest"
import { isCoveredGovernorate } from "@/lib/shipping-coverage"
import { quickSpecs } from "@/lib/services/product-facets"

/**
 * The published rates are Cairo and Giza prices. Everywhere else is quoted per order.
 *
 * The checkout's governorate field is free text, so this is a matching problem and the matching
 * has to survive how people actually type an Egyptian address: with or without "ال", with any
 * of أ إ آ, with ة or ه at the end, in either language, with a country appended.
 */
describe("shipping coverage", () => {
    it.each(["Cairo", "cairo", "CAIRO", "Cairo, Egypt", "القاهرة", "القاهره", "قاهرة", "  القاهرة  "])(
        "covers %s",
        (value) => {
            expect(isCoveredGovernorate(value)).toBe(true)
        }
    )

    it.each(["Giza", "giza", "El Giza", "Al Giza", "الجيزة", "الجيزه", "جيزه"])("covers %s", (value) => {
        expect(isCoveredGovernorate(value)).toBe(true)
    })

    it.each(["Alexandria", "الإسكندرية", "الاسكندريه", "Aswan", "أسوان", "Port Said", "بورسعيد", "Luxor"])(
        "does not cover %s",
        (value) => {
            expect(isCoveredGovernorate(value)).toBe(false)
        }
    )

    /**
     * Empty is COVERED, and that is the deliberate answer: the field is blank because the
     * customer has not typed yet, and warning somebody about a decision they have not made is
     * how a form teaches people to ignore its warnings. The standing note beside the rates
     * carries that moment.
     */
    it.each([null, undefined, "", "   "])("treats %s as covered rather than as a warning", (value) => {
        expect(isCoveredGovernorate(value)).toBe(true)
    })

    it("does not match a governorate that merely contains the letters", () => {
        // Guarding the substring match: these must not be dragged in by "giza"/"cairo".
        expect(isCoveredGovernorate("Ismailia")).toBe(false)
        expect(isCoveredGovernorate("Beheira")).toBe(false)
    })
})

/**
 * Quick specs on a tile.
 *
 * A card stands for a FAMILY, so a spec can hold several values. What a reader needs is the
 * span, in the digits the rest of the tile is written in.
 */
describe("quick specs", () => {
    const definitions = [
        { key: "maximum_wattage", label: "Maximum Wattage", unit: "W", numeric: true, order: 0 },
        { key: "input_voltage", label: "Input Voltage", unit: null, numeric: false, order: 1 },
        { key: "finish", label: "Finish", unit: null, numeric: false, order: 2 },
        { key: "beam", label: "Beam", unit: "°", numeric: true, order: 3 },
    ]

    it("collapses a family's numeric spec to its ends, in the stored digits", () => {
        expect(quickSpecs({ specs: { maximum_wattage: ["6", "12", "30"] } }, definitions)).toEqual([
            { label: "Maximum Wattage", value: "6-30 W" },
        ])
        // Arabic-Indic digits order correctly AND survive to the screen.
        expect(quickSpecs({ specs: { maximum_wattage: ["٦", "١٢", "٣٠"] } }, definitions)).toEqual([
            { label: "Maximum Wattage", value: "٦-٣٠ W" },
        ])
    })

    it("prints one figure rather than a range of it to itself", () => {
        expect(quickSpecs({ specs: { maximum_wattage: ["5", "5"] } }, definitions)).toEqual([
            { label: "Maximum Wattage", value: "5 W" },
        ])
    })

    it("drops a non-numeric spec with several values rather than crowding the tile", () => {
        expect(quickSpecs({ specs: { finish: ["White", "Black"] } }, definitions)).toEqual([])
        // A single text value is fine.
        expect(quickSpecs({ specs: { finish: ["White"] } }, definitions)).toEqual([
            { label: "Finish", value: "White" },
        ])
    })

    it("takes the operator's order and stops at the cap", () => {
        const specs = { beam: ["24"], finish: ["White"], input_voltage: ["AC 220V"], maximum_wattage: ["9"] }
        expect(quickSpecs({ specs }, definitions, "en", 3).map((s) => s.label)).toEqual([
            "Maximum Wattage",
            "Input Voltage",
            "Finish",
        ])
    })

    it("prints the reader's digits without changing the filter key", () => {
        expect(quickSpecs({ specs: { maximum_wattage: ["6", "30"] } }, definitions, "ar")).toEqual([
            { label: "Maximum Wattage", value: "٦-٣٠ W" },
        ])
        expect(quickSpecs({ specs: { maximum_wattage: ["6", "30"] } }, definitions, "en")).toEqual([
            { label: "Maximum Wattage", value: "6-30 W" },
        ])
    })

    it("skips a spec the product does not answer", () => {
        expect(quickSpecs({ specs: { finish: ["Black"] } }, definitions, "en", 3)).toEqual([
            { label: "Finish", value: "Black" },
        ])
    })
})
