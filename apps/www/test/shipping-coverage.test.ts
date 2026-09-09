import { describe, expect, it } from "vitest"
import { isCoveredGovernorate } from "@/lib/shipping-coverage"
import { quickSpecs } from "@/lib/services/product-facets"

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

    it.each([null, undefined, "", "   "])("treats %s as covered rather than as a warning", (value) => {
        expect(isCoveredGovernorate(value)).toBe(true)
    })

    it("does not match a governorate that merely contains the letters", () => {
        expect(isCoveredGovernorate("Ismailia")).toBe(false)
        expect(isCoveredGovernorate("Beheira")).toBe(false)
    })
})

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
