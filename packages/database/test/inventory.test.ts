import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "./harness"
import { seedFixture, seedStock, LOCATION_ID, type Fixture } from "./fixtures"
import {
    availableQuantity,
    InsufficientStockError,
    reconcile,
    recordMovement,
    release,
    reserve,
} from "../inventory"

let db: TestDatabase
let fixture: Fixture

beforeAll(async () => {
    db = await createTestDatabase()
    fixture = await seedFixture(db.prisma)
})
afterAll(async () => db?.drop())

async function level(productId: string) {
    const row = await db.prisma.stockLevel.findUnique({
        where: { productId_locationId: { productId, locationId: LOCATION_ID } },
        select: { onHand: true, reserved: true },
    })
    return { onHand: row?.onHand ?? 0, reserved: row?.reserved ?? 0 }
}

describe("the ledger invariant", () => {
    it("holds after an arbitrary sequence of operations", async () => {
        const product = fixture.products.small
        await seedStock(db.prisma, product, 100)

        const operations: Array<{ type: Parameters<typeof recordMovement>[1]["type"]; quantity: number }> = [
            { type: "PURCHASE_RECEIPT", quantity: 50 },
            { type: "SALE", quantity: -20 },
            { type: "RETURN", quantity: 5 },
            { type: "DAMAGE", quantity: -3 },
            { type: "ADJUSTMENT", quantity: 7 },
            { type: "SALE", quantity: -11 },
            { type: "ADJUSTMENT", quantity: -2 },
            { type: "PURCHASE_RECEIPT", quantity: 30 },
            { type: "TRANSFER_OUT", quantity: -8 },
            { type: "TRANSFER_IN", quantity: 8 },
        ]

        for (const [index, operation] of operations.entries()) {
            await db.prisma.$transaction((tx) =>
                recordMovement(tx, {
                    productId: product,
                    locationId: LOCATION_ID,
                    type: operation.type,
                    quantity: operation.quantity,
                    reason: `sequence step ${index}`,
                    actorType: "SYSTEM",
                })
            )
            if (index % 3 === 0) {
                await db.prisma.$transaction((tx) => reserve(tx, product, 2))
                await db.prisma.$transaction((tx) => release(tx, product, 2))
            }
        }

        const expected = 100 + operations.reduce((sum, o) => sum + o.quantity, 0)
        expect((await level(product)).onHand).toBe(expected)

        const drift = await db.prisma.$transaction((tx) => reconcile(tx, LOCATION_ID))
        expect(drift).toEqual([])
    })

    it("reconcile() reports drift when the level is written behind the ledger's back", async () => {
        const product = fixture.products.large
        await seedStock(db.prisma, product, 40)

        await db.prisma.stockLevel.update({
            where: { productId_locationId: { productId: product, locationId: LOCATION_ID } },
            data: { onHand: 999 },
        })

        const drift = await db.prisma.$transaction((tx) => reconcile(tx, LOCATION_ID))
        expect(drift).toContainEqual({ productId: product, ledger: 40, stored: 999 })

        await db.prisma.stockLevel.update({
            where: { productId_locationId: { productId: product, locationId: LOCATION_ID } },
            data: { onHand: 40 },
        })
    })
})

describe("movement direction", () => {
    it("refuses a SALE with a positive quantity", async () => {
        await expect(
            db.prisma.$transaction((tx) =>
                recordMovement(tx, { productId: fixture.products.single, type: "SALE", quantity: 5 })
            )
        ).rejects.toThrow(RangeError)
    })

    it("refuses a PURCHASE_RECEIPT with a negative quantity", async () => {
        await expect(
            db.prisma.$transaction((tx) =>
                recordMovement(tx, { productId: fixture.products.single, type: "PURCHASE_RECEIPT", quantity: -5 })
            )
        ).rejects.toThrow(RangeError)
    })

    it("refuses an ADJUSTMENT of zero, which records nothing", async () => {
        await expect(
            db.prisma.$transaction((tx) =>
                recordMovement(tx, { productId: fixture.products.single, type: "ADJUSTMENT", quantity: 0 })
            )
        ).rejects.toThrow(RangeError)
    })

    it("refuses a negative unitCost", async () => {
        await expect(
            db.prisma.$transaction((tx) =>
                recordMovement(tx, {
                    productId: fixture.products.single,
                    type: "PURCHASE_RECEIPT",
                    quantity: 1,
                    unitCost: "-1.00",
                })
            )
        ).rejects.toThrow(RangeError)
    })
})

describe("idempotency (F5)", () => {
    it("applies a referenced movement once, however many times it is retried", async () => {
        const product = fixture.products.single
        await seedStock(db.prisma, product, 10)
        const before = await level(product)

        const reference = { referenceType: "order", referenceId: "retry-me" }
        const first = await db.prisma.$transaction((tx) =>
            recordMovement(tx, { productId: product, type: "SALE", quantity: -4, ...reference })
        )
        const second = await db.prisma.$transaction((tx) =>
            recordMovement(tx, { productId: product, type: "SALE", quantity: -4, ...reference })
        )
        const third = await db.prisma.$transaction((tx) =>
            recordMovement(tx, { productId: product, type: "SALE", quantity: -4, ...reference })
        )

        expect(first.deduplicated).toBe(false)
        expect(second.deduplicated).toBe(true)
        expect(third.deduplicated).toBe(true)
        expect((await level(product)).onHand).toBe(before.onHand - 4)
    })

    it("does not collapse a SALE and a RETURN that share a reference", async () => {
        const product = fixture.products.single
        const before = await level(product)
        await db.prisma.$transaction((tx) =>
            recordMovement(tx, { productId: product, type: "RETURN", quantity: 4, referenceType: "order", referenceId: "retry-me" })
        )
        expect((await level(product)).onHand).toBe(before.onHand + 4)
    })
})

describe("reservations", () => {
    it("rejects an oversell rather than going negative", async () => {
        const product = fixture.products.small
        const available = await db.prisma.$transaction((tx) => availableQuantity(tx, product))
        await expect(
            db.prisma.$transaction((tx) => reserve(tx, product, available + 1))
        ).rejects.toThrow(InsufficientStockError)
    })

    it("counts reserved stock as unavailable", async () => {
        const product = fixture.products.small
        const before = await db.prisma.$transaction((tx) => availableQuantity(tx, product))
        await db.prisma.$transaction((tx) => reserve(tx, product, 6))
        expect(await db.prisma.$transaction((tx) => availableQuantity(tx, product))).toBe(before - 6)
        await db.prisma.$transaction((tx) => release(tx, product, 6))
        expect(await db.prisma.$transaction((tx) => availableQuantity(tx, product))).toBe(before)
    })

    it("clamps a double release instead of inventing stock", async () => {
        const product = fixture.products.small
        await db.prisma.$transaction((tx) => reserve(tx, product, 3))
        await db.prisma.$transaction((tx) => release(tx, product, 3))
        await db.prisma.$transaction((tx) => release(tx, product, 3))
        expect((await level(product)).reserved).toBe(0)
    })

    it("refuses to reserve a fractional or zero quantity", async () => {
        await expect(db.prisma.$transaction((tx) => reserve(tx, fixture.products.small, 0))).rejects.toThrow(RangeError)
        await expect(db.prisma.$transaction((tx) => reserve(tx, fixture.products.small, 1.5))).rejects.toThrow(RangeError)
    })
})

describe("the database's own guarantees", () => {
    it("refuses negative stock at the constraint, not just in code", async () => {
        await expect(
            db.prisma.$executeRawUnsafe(
                `UPDATE stock_levels SET "onHand" = -1 WHERE "productId" = '${fixture.products.small}'`
            )
        ).rejects.toThrow(/stock_levels_on_hand_non_negative/)
    })

    it("refuses to reserve more than is on hand, at the constraint", async () => {
        await expect(
            db.prisma.$executeRawUnsafe(
                `UPDATE stock_levels SET reserved = "onHand" + 1 WHERE "productId" = '${fixture.products.small}'`
            )
        ).rejects.toThrow(/stock_levels_reserved_within_stock/)
    })

    it("refuses a product priced at zero", async () => {
        await expect(
            db.prisma.$executeRawUnsafe(`UPDATE products SET price = 0 WHERE id = '${fixture.products.small}'`)
        ).rejects.toThrow(/products_price_positive/)
    })
})
