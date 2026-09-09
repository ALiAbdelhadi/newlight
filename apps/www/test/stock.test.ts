import { describe, expect, it } from "vitest"
import { availableOf, LOW_STOCK_THRESHOLD, stockStatusOf, stockStatusOfLevels } from "@/lib/stock"
import { toListingProduct } from "@/lib/services/product-facets"
import type { CardView, ProductListCard } from "@/lib/services/selectors"

describe("stock status", () => {
    it("calls nothing in stock once the free quantity hits zero", () => {
        expect(stockStatusOf(0)).toBe("out")
        expect(stockStatusOf(-4)).toBe("out")
    })

    it("treats the threshold itself as low, and one more than it as in stock", () => {
        expect(stockStatusOf(1)).toBe("low")
        expect(stockStatusOf(LOW_STOCK_THRESHOLD)).toBe("low")
        expect(stockStatusOf(LOW_STOCK_THRESHOLD + 1)).toBe("in")
    })

    it("counts reserved units as gone, and never reports a negative quantity", () => {
        expect(availableOf([{ onHand: 10, reserved: 4 }])).toBe(6)
        expect(availableOf([{ onHand: 3, reserved: 9 }])).toBe(0)
        expect(availableOf([])).toBe(0)
        expect(stockStatusOfLevels([{ onHand: 8, reserved: 8 }])).toBe("out")
    })
})

describe("listing cards", () => {
    const row = (levels: Array<{ onHand: number; reserved: number }>) =>
        ({
            id: "p1",
            slug: "p1",
            productId: "P1",
            familyId: "f1",
            translations: [{ name: "Downlight" }],
            family: { translations: [{ name: "Downlight family" }] },
            images: [],
            availableColors: [],
            specs: [],
            colorTemperatures: [],
            stockLevels: levels,
            price: "100.00",
            basePrice: "100.00",
            discountPercent: 0,
            isDiscounted: false,
            isFeatured: false,
            createdAt: new Date("2026-01-01"),
        }) as unknown as CardView<ProductListCard>

    it("adds up the whole family before deciding the card's state", () => {
        const a = row([{ onHand: 2, reserved: 0 }])
        const b = row([{ onHand: 2, reserved: 0 }])
        expect(toListingProduct(a, [a, b], "en").stockStatus).toBe("low")
        expect(toListingProduct(a, [a, b], "en").available).toBe(true)
    })

    it("marks a family whose every variant is reserved as out of stock", () => {
        const a = row([{ onHand: 5, reserved: 5 }])
        const b = row([{ onHand: 0, reserved: 0 }])
        const listing = toListingProduct(a, [a, b], "en")
        expect(listing.stockStatus).toBe("out")
        expect(listing.available).toBe(false)
    })
})
