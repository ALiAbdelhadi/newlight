import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import { seedFixture, type Fixture } from "@repo/database/test-fixtures"

/**
 * The customer's order list — the page that did not exist while the header linked to it.
 *
 * Two properties matter here and neither is visible from the page:
 *
 *   The product names must follow the CUSTOMER's locale. The include read
 *   `translations: { take: 1 }` with no `where`, so PostgreSQL returned whichever row it liked
 *   and an English customer could be shown Arabic (§14.4).
 *
 *   Money must be a STRING by the time it leaves the service. `total` and every line price are
 *   `Decimal`, and a Decimal cannot cross into a Client Component at all (ADR 0001, A82).
 */
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
    fixture = await seedFixture(db.prisma)

    // Two orders, so pagination has something to page.
    for (const [index, sku] of [fixture.products.small, fixture.products.large].entries()) {
        await db.prisma.order.create({
            data: {
                userId: fixture.userId,
                orderNumber: `NL-TEST-${index}`,
                idempotencyKey: `key-${index}`,
                subtotal: "300.00",
                shippingCost: "100.00",
                total: "400.00",
                items: {
                    create: [
                        { productId: sku, productName: "snapshot", productImage: "/x.png", price: "150.00", quantity: 2 },
                    ],
                },
            },
        })
    }
})
afterAll(async () => db?.drop())

async function history(locale: "en" | "ar", options?: { skip?: number; take?: number }) {
    const { UserService } = await import("@/lib/services/user-service")
    return UserService.getOrderHistory(fixture.userId, locale, options)
}

describe("order history", () => {
    it("returns the customer's orders, newest first", async () => {
        const { orders, pagination } = await history("en")
        expect(pagination.total).toBe(2)
        expect(orders.map((o) => o.orderNumber)).toEqual(["NL-TEST-1", "NL-TEST-0"])
    })

    it("serialises every money field as a string", async () => {
        const [order] = (await history("en")).orders
        expect(order!.total).toBe("400.00")
        expect(order!.subtotal).toBe("300.00")
        expect(order!.shippingCost).toBe("100.00")
        expect(order!.items[0]!.price).toBe("150.00")
        // The point of the assertion: not a Decimal, not an object, a string.
        expect(typeof order!.total).toBe("string")
    })

    it("names products in the requested locale, not whichever row the database returns first", async () => {
        await db.prisma.productTranslation.updateMany({
            where: { product: { productId: fixture.skus.large }, locale: "en" },
            data: { name: "10W Panel Light" },
        })
        await db.prisma.productTranslation.updateMany({
            where: { product: { productId: fixture.skus.large }, locale: "ar" },
            data: { name: "بانل لايت ١٠ وات" },
        })

        const en = (await history("en")).orders.flatMap((o) => o.items).map((i) => i.product.name)
        const ar = (await history("ar")).orders.flatMap((o) => o.items).map((i) => i.product.name)

        expect(en).toContain("10W Panel Light")
        expect(en).not.toContain("بانل لايت ١٠ وات")
        expect(ar).toContain("بانل لايت ١٠ وات")
        expect(ar).not.toContain("10W Panel Light")
    })

    it("falls back to the SKU rather than rendering an empty name", async () => {
        await db.prisma.productTranslation.deleteMany({
            where: { product: { productId: fixture.skus.small }, locale: "en" },
        })
        const names = (await history("en")).orders.flatMap((o) => o.items).map((i) => i.product.name)
        expect(names).toContain(fixture.skus.small)
    })

    it("pages, and reports a total that is not just the page", async () => {
        const first = await history("en", { skip: 0, take: 1 })
        const second = await history("en", { skip: 1, take: 1 })

        expect(first.orders).toHaveLength(1)
        expect(second.orders).toHaveLength(1)
        expect(first.orders[0]!.orderNumber).not.toBe(second.orders[0]!.orderNumber)
        expect(first.pagination.total).toBe(2)
        expect(first.pagination.hasMore).toBe(true)
        expect(second.pagination.hasMore).toBe(false)
    })
})
