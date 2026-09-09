import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
    applyDiscount,
    discountApplies,
    loadActiveDiscounts,
    MIN_EFFECTIVE_PRICE,
    resolveEffectivePrice,
    type ActiveDiscount,
} from "../pricing"
import { createTestDatabase, type TestDatabase } from "./harness"
import { seedFixture, type Fixture } from "./fixtures"

const BASE: Omit<ActiveDiscount, "id" | "scopeType"> = {
    name: "test",
    kind: "PERCENT",
    value: "10.00",
    subCategoryIds: [],
    familyId: null,
    productIds: [],
    startsAt: new Date("2026-01-01T00:00:00Z"),
    endsAt: new Date("2026-02-01T00:00:00Z"),
}

const PRODUCT = { id: "p1", familyId: "f1", subCategoryId: "s1" }

function discount(over: Partial<ActiveDiscount> & Pick<ActiveDiscount, "scopeType">): ActiveDiscount {
    return { ...BASE, id: over.id ?? `d-${over.scopeType}`, ...over }
}

describe("applying one discount to one price", () => {
    it("takes a percentage off, rounded once", () => {
        expect(applyDiscount("1000.00", { kind: "PERCENT", value: "15" }).toFixed(2)).toBe("850.00")
        expect(applyDiscount("199.50", { kind: "PERCENT", value: "15" }).toFixed(2)).toBe("169.58")
    })

    it("takes a fixed amount off", () => {
        expect(applyDiscount("1000.00", { kind: "AMOUNT", value: "55.30" }).toFixed(2)).toBe("944.70")
    })

    it("never produces a price of zero or less", () => {
        expect(applyDiscount("40.00", { kind: "AMOUNT", value: "500" }).toFixed(2)).toBe(MIN_EFFECTIVE_PRICE)
    })
})

describe("scope matching", () => {
    it("ALL covers everything", () => {
        expect(discountApplies(discount({ scopeType: "ALL" }), PRODUCT)).toBe(true)
    })

    it("a family discount covers only its own family", () => {
        expect(discountApplies(discount({ scopeType: "FAMILY", familyId: "f1" }), PRODUCT)).toBe(true)
        expect(discountApplies(discount({ scopeType: "FAMILY", familyId: "other" }), PRODUCT)).toBe(false)
        expect(
            discountApplies(discount({ scopeType: "FAMILY", familyId: "f1" }), { ...PRODUCT, familyId: null })
        ).toBe(false)
    })

    it("a product discount covers only the products it names", () => {
        expect(discountApplies(discount({ scopeType: "PRODUCTS", productIds: ["p1"] }), PRODUCT)).toBe(true)
        expect(discountApplies(discount({ scopeType: "PRODUCTS", productIds: ["p2"] }), PRODUCT)).toBe(false)
    })

    it("a category discount matches through the sub-categories it was expanded into", () => {
        expect(discountApplies(discount({ scopeType: "CATEGORY", subCategoryIds: ["s1"] }), PRODUCT)).toBe(true)
        expect(discountApplies(discount({ scopeType: "CATEGORY", subCategoryIds: ["s9"] }), PRODUCT)).toBe(false)
    })
})

describe("resolving a price against the whole live set", () => {
    it("leaves the price alone when nothing applies", () => {
        const resolved = resolveEffectivePrice("1000.00", PRODUCT, [])
        expect(resolved).toMatchObject({ base: "1000.00", effective: "1000.00", saving: "0.00", percentOff: 0 })
        expect(resolved.discount).toBeNull()
    })

    it("DOES NOT STACK — the customer gets the single best one", () => {
        const resolved = resolveEffectivePrice("1000.00", PRODUCT, [
            discount({ id: "a", scopeType: "ALL", value: "20.00" }),
            discount({ id: "b", scopeType: "FAMILY", familyId: "f1", value: "30.00" }),
        ])
        expect(resolved.effective).toBe("700.00")
        expect(resolved.discount?.id).toBe("b")
        expect(resolved.percentOff).toBe(30)
    })

    it("prefers the cheaper price regardless of how narrow the scope is", () => {
        const resolved = resolveEffectivePrice("1000.00", PRODUCT, [
            discount({ id: "narrow", scopeType: "PRODUCTS", productIds: ["p1"], value: "5.00" }),
            discount({ id: "wide", scopeType: "ALL", value: "25.00" }),
        ])
        expect(resolved.discount?.id).toBe("wide")
    })

    it("breaks a tie towards the narrower scope, so the badge names the expected one", () => {
        const resolved = resolveEffectivePrice("1000.00", PRODUCT, [
            discount({ id: "wide", scopeType: "ALL", value: "10.00" }),
            discount({ id: "narrow", scopeType: "PRODUCTS", productIds: ["p1"], value: "10.00" }),
        ])
        expect(resolved.discount?.id).toBe("narrow")
    })

    it("ignores a discount that saves nothing", () => {
        const resolved = resolveEffectivePrice("1000.00", PRODUCT, [
            discount({ scopeType: "ALL", kind: "AMOUNT", value: "0.001" }),
        ])
        expect(resolved.discount).toBeNull()
        expect(resolved.effective).toBe("1000.00")
    })
})

describe("the window, against a real database", () => {
    let db: TestDatabase
    let fixture: Fixture

    beforeAll(async () => {
        db = await createTestDatabase()
    })
    afterAll(async () => db?.drop())

    beforeEach(async () => {
        await db.prisma.discountProduct.deleteMany()
        await db.prisma.discount.deleteMany()
        await db.prisma.productSpec.deleteMany()
        await db.prisma.productImage.deleteMany()
        await db.prisma.productAvailableColor.deleteMany()
        await db.prisma.productSlugHistory.deleteMany()
        await db.prisma.taxonomySlugHistory.deleteMany()
        await db.prisma.product.deleteMany()
        await db.prisma.productFamily.deleteMany()
        await db.prisma.subCategory.deleteMany()
        await db.prisma.category.deleteMany()
        await db.prisma.user.deleteMany()
        fixture = await seedFixture(db.prisma)
    })

    async function makeDiscount(data: {
        startsAt: Date
        endsAt: Date
        isActive?: boolean
        scopeType?: "ALL" | "CATEGORY" | "FAMILY"
    }) {
        return db.prisma.discount.create({
            data: {
                name: "window test",
                kind: "PERCENT",
                value: "10.00",
                scopeType: data.scopeType ?? "ALL",
                categoryId: data.scopeType === "CATEGORY" ? fixture.categoryId : null,
                familyId: data.scopeType === "FAMILY" ? fixture.familyId : null,
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                isActive: data.isActive ?? true,
            },
        })
    }

    const AT = new Date("2026-06-15T12:00:00Z")

    it("is half-open: live at the start, over at the end", async () => {
        const starting = await makeDiscount({ startsAt: AT, endsAt: new Date("2026-06-20T00:00:00Z") })
        const ending = await makeDiscount({ startsAt: new Date("2026-06-01T00:00:00Z"), endsAt: AT })

        const live = await loadActiveDiscounts(db.prisma, AT)
        const ids = live.map((row) => row.id)

        expect(ids).toContain(starting.id)
        expect(ids).not.toContain(ending.id)
    })

    it("excludes a stopped discount even inside its window", async () => {
        await makeDiscount({
            startsAt: new Date("2026-06-01T00:00:00Z"),
            endsAt: new Date("2026-06-30T00:00:00Z"),
            isActive: false,
        })
        expect(await loadActiveDiscounts(db.prisma, AT)).toHaveLength(0)
    })

    it("expands a category discount into its sub-categories, so a product row is enough to match", async () => {
        await makeDiscount({
            startsAt: new Date("2026-06-01T00:00:00Z"),
            endsAt: new Date("2026-06-30T00:00:00Z"),
            scopeType: "CATEGORY",
        })

        const [live] = await loadActiveDiscounts(db.prisma, AT)
        expect(live!.subCategoryIds).toEqual([fixture.subCategoryId])

        const product = await db.prisma.product.findUniqueOrThrow({ where: { id: fixture.products.single } })
        expect(resolveEffectivePrice(product.price, product, [live!]).effective).toBe("900.00")
    })

    it("carries the named products of a PRODUCTS discount", async () => {
        const created = await db.prisma.discount.create({
            data: {
                name: "two SKUs",
                kind: "AMOUNT",
                value: "50.00",
                scopeType: "PRODUCTS",
                startsAt: new Date("2026-06-01T00:00:00Z"),
                endsAt: new Date("2026-06-30T00:00:00Z"),
                products: { createMany: { data: [{ productId: fixture.products.small }] } },
            },
        })

        const [live] = await loadActiveDiscounts(db.prisma, AT)
        expect(live!.id).toBe(created.id)
        expect(live!.productIds).toEqual([fixture.products.small])

        const small = await db.prisma.product.findUniqueOrThrow({ where: { id: fixture.products.small } })
        const large = await db.prisma.product.findUniqueOrThrow({ where: { id: fixture.products.large } })
        expect(resolveEffectivePrice(small.price, small, [live!]).effective).toBe("100.00")
        expect(resolveEffectivePrice(large.price, large, [live!]).effective).toBe("199.50")
    })
})

describe("the database refuses a discount the resolver could not explain", () => {
    let db: TestDatabase

    beforeAll(async () => {
        db = await createTestDatabase()
    })
    afterAll(async () => db?.drop())

    const window = { startsAt: new Date("2026-06-01T00:00:00Z"), endsAt: new Date("2026-06-30T00:00:00Z") }

    it("refuses a window that ends before it starts", async () => {
        await expect(
            db.prisma.discount.create({
                data: {
                    name: "backwards",
                    kind: "PERCENT",
                    value: "10",
                    scopeType: "ALL",
                    startsAt: window.endsAt,
                    endsAt: window.startsAt,
                },
            })
        ).rejects.toThrow(/discounts_window_ordered/)
    })

    it("refuses 100% off", async () => {
        await expect(
            db.prisma.discount.create({
                data: { name: "free", kind: "PERCENT", value: "100", scopeType: "ALL", ...window },
            })
        ).rejects.toThrow(/discounts_percent_bounded/)
    })

    it("refuses a scope that disagrees with its target", async () => {
        const category = await db.prisma.category.create({ data: {} })
        await expect(
            db.prisma.discount.create({
                data: {
                    name: "mismatched",
                    kind: "PERCENT",
                    value: "10",
                    scopeType: "ALL",
                    categoryId: category.id,
                    ...window,
                },
            })
        ).rejects.toThrow(/discounts_scope_target_matches/)
    })
})
