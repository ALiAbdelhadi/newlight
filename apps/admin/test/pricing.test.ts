import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import { seedFixture, type Fixture } from "@repo/database/test-fixtures"

let db: TestDatabase
let fixture: Fixture

const holder = vi.hoisted(() => ({ client: null as unknown }))

vi.mock("@repo/database", async () => {
    const actual = await vi.importActual<typeof import("@repo/database")>("@repo/database")
    return {
        ...actual,
        get prisma() {
            return holder.client
        },
    }
})

beforeAll(async () => {
    db = await createTestDatabase()
    holder.client = db.prisma
})
afterAll(async () => db?.drop())

beforeEach(async () => {
    await db.prisma.adminAuditLog.deleteMany()
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

async function service() {
    return (await import("@/lib/services/pricing-service")).PricingService
}

describe("the three real repricing tiers reproduce exactly", () => {
    it("tier A: × 1.1000", async () => {
        const PricingService = await service()
        const preview = await PricingService.preview(
            { kind: "products", productIds: [fixture.products.small] },
            { kind: "linear", multiplier: "1.1000", addend: "0" }
        )
        expect(preview.rows[0]!.oldPrice).toBe("150.00")
        expect(preview.rows[0]!.newPrice).toBe("165.00")
    })

    it("tier C: × 1.5736 + 55.3 — a multiplier AND a fixed component", async () => {
        const PricingService = await service()
        const preview = await PricingService.preview(
            { kind: "products", productIds: [fixture.products.single] },
            { kind: "linear", multiplier: "1.5736", addend: "55.3" }
        )
        expect(preview.rows[0]!.newPrice).toBe("1628.90")
    })

    it("supports percent, fixed and set as well", async () => {
        const PricingService = await service()
        const scope = { kind: "products", productIds: [fixture.products.small] } as const

        expect((await PricingService.preview(scope, { kind: "percent", percent: "10" })).rows[0]!.newPrice).toBe("165.00")
        expect((await PricingService.preview(scope, { kind: "percent", percent: "-5" })).rows[0]!.newPrice).toBe("142.50")
        expect((await PricingService.preview(scope, { kind: "fixed", amount: "55.30" })).rows[0]!.newPrice).toBe("205.30")
        expect((await PricingService.preview(scope, { kind: "set", amount: "99.99" })).rows[0]!.newPrice).toBe("99.99")
    })
})

describe("the preview is a mechanism, not a convention", () => {
    it("refuses to apply without a token from a preview", async () => {
        const PricingService = await service()
        await expect(
            PricingService.apply(
                { kind: "products", productIds: [fixture.products.small] },
                { kind: "percent", percent: "10" },
                "not-a-real-token"
            )
        ).rejects.toThrow(/changed since this preview/)

        const unchanged = await db.prisma.product.findUniqueOrThrow({ where: { id: fixture.products.small } })
        expect(unchanged.price.toFixed(2)).toBe("150.00")
    })

    it("refuses a token minted against prices that have since changed", async () => {
        const PricingService = await service()
        const scope = { kind: "products", productIds: [fixture.products.small] } as const
        const formula = { kind: "percent", percent: "10" } as const

        const preview = await PricingService.preview(scope, formula)

        await db.prisma.product.update({ where: { id: fixture.products.small }, data: { price: "175.00" } })

        await expect(PricingService.apply(scope, formula, preview.token)).rejects.toThrow(/changed since this preview/)
        const after = await db.prisma.product.findUniqueOrThrow({ where: { id: fixture.products.small } })
        expect(after.price.toFixed(2)).toBe("175.00")
    })

    it("applies when the token matches", async () => {
        const PricingService = await service()
        const scope = { kind: "subCategory", subCategoryId: fixture.subCategoryId } as const
        const formula = { kind: "percent", percent: "10" } as const

        const preview = await PricingService.preview(scope, formula)
        expect(preview.count).toBe(3)

        const result = await PricingService.apply(scope, formula, preview.token)
        expect(result.count).toBe(3)

        const products = await db.prisma.product.findMany({ orderBy: { productId: "asc" } })
        expect(products.map((p) => p.price.toFixed(2))).toEqual(["1100.00", "219.45", "165.00"])
    })
})

describe("refusals", () => {
    it("refuses a formula that would price anything at or below zero", async () => {
        const PricingService = await service()
        const scope = { kind: "subCategory", subCategoryId: fixture.subCategoryId } as const
        const formula = { kind: "fixed", amount: "-2000" } as const

        const preview = await PricingService.preview(scope, formula)
        expect(preview.invalid.length).toBeGreaterThan(0)

        await expect(PricingService.apply(scope, formula, preview.token)).rejects.toThrow(/at or below zero/)
    })

    it("refuses an empty selection rather than reporting a successful no-op", async () => {
        const PricingService = await service()
        await expect(
            PricingService.preview({ kind: "products", productIds: [] }, { kind: "percent", percent: "10" })
        ).rejects.toThrow(/no products/)
    })
})

describe("the audit row is the price history (§3)", () => {
    it("records actor, scope, formula, count and every row", async () => {
        const PricingService = await service()
        const scope = { kind: "family", familyId: fixture.familyId } as const
        const formula = { kind: "linear", multiplier: "1.1", addend: "5" } as const

        const preview = await PricingService.preview(scope, formula)
        await PricingService.apply(scope, formula, preview.token)

        const audit = await db.prisma.adminAuditLog.findFirstOrThrow({ where: { action: "product.bulk_reprice" } })
        expect(audit.actorType).toBe("ADMIN")
        expect(audit.actorId).toBe("test-admin")

        const diff = audit.diff as { count: number; formula: unknown; changes: Array<{ sku: string; from: string; to: string }> }
        expect(diff.count).toBe(2)
        expect(diff.formula).toEqual(formula)
        expect(diff.changes.map((c) => c.sku).sort()).toEqual(["nl-test-10w", "nl-test-5w"])
        expect(diff.changes.find((c) => c.sku === "nl-test-5w")).toEqual({ sku: "nl-test-5w", from: "150.00", to: "170.00" })
    })

    it("reads price history back per product, with no separate table", async () => {
        const PricingService = await service()
        const scope = { kind: "products", productIds: [fixture.products.small] } as const

        for (const percent of ["10", "10"]) {
            const preview = await PricingService.preview(scope, { kind: "percent", percent })
            await PricingService.apply(scope, { kind: "percent", percent }, preview.token)
        }

        const history = await PricingService.priceHistory(fixture.products.small)
        expect(history).toHaveLength(2)
        expect(history[0]!.to).toBe("181.50")
        expect(history[1]!.from).toBe("150.00")
    })

    it("writes nothing when the apply is refused", async () => {
        const PricingService = await service()
        await expect(
            PricingService.apply({ kind: "products", productIds: [fixture.products.small] }, { kind: "percent", percent: "10" }, "bad")
        ).rejects.toThrow()
        expect(await db.prisma.adminAuditLog.count()).toBe(0)
    })
})
