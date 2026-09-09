import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "./harness"
import { seedFixture, seedStock, LOCATION_ID, type Fixture } from "./fixtures"
import { OPENING_COUNT_PENDING_KEY, recordMovement } from "../inventory"
import { codRefusalRate, deadStock, grossMargin, isOpeningCountPending, sellThrough, stocktakeVariance, stockValuation } from "../reporting"

let db: TestDatabase
let fixture: Fixture

beforeAll(async () => {
    db = await createTestDatabase()
    fixture = await seedFixture(db.prisma)
    await seedStock(db.prisma, fixture.products.small, 100)
    await seedStock(db.prisma, fixture.products.large, 50)
})
afterAll(async () => db?.drop())

describe("refusing to invent a number (N1, §13.6)", () => {
    it("refuses valuation while the opening count is pending", async () => {
        await db.prisma.systemSetting.create({ data: { key: OPENING_COUNT_PENDING_KEY, value: "true" } })
        expect(await isOpeningCountPending(db.prisma)).toBe(true)

        expect(await stockValuation(db.prisma)).toEqual({ available: false, reason: "opening-count-pending" })
        expect(await grossMargin(db.prisma, new Date(0))).toEqual({ available: false, reason: "opening-count-pending" })
    })

    it("still refuses once the flag clears, if any stock has no recorded cost", async () => {
        await db.prisma.systemSetting.update({ where: { key: OPENING_COUNT_PENDING_KEY }, data: { value: "false" } })

        expect(await stockValuation(db.prisma)).toEqual({ available: false, reason: "cost-not-recorded" })
    })

    it("gives a number once every product on hand has a cost", async () => {
        await db.prisma.product.update({ where: { id: fixture.products.small }, data: { averageCost: "10.00" } })
        await db.prisma.product.update({ where: { id: fixture.products.large }, data: { averageCost: "4.00" } })

        expect(await stockValuation(db.prisma)).toEqual({ available: true, value: "1200.00" })
    })
})

describe("the reports themselves", () => {
    it("reports no variance while the ledger is the only writer", async () => {
        expect(await stocktakeVariance(db.prisma)).toEqual([])
    })

    it("reports variance the moment something writes the level directly", async () => {
        await db.prisma.stockLevel.update({
            where: { productId_locationId: { productId: fixture.products.small, locationId: LOCATION_ID } },
            data: { onHand: 111 },
        })
        const variance = await stocktakeVariance(db.prisma)
        expect(variance).toHaveLength(1)
        expect(variance[0]).toMatchObject({ sku: "nl-test-5w", ledger: 100, stored: 111, variance: 11 })

        await db.prisma.stockLevel.update({
            where: { productId_locationId: { productId: fixture.products.small, locationId: LOCATION_ID } },
            data: { onHand: 100 },
        })
    })

    it("counts sell-through from SALE movements, as positive units", async () => {
        const since = new Date(Date.now() - 60_000)
        await db.prisma.$transaction((tx) =>
            recordMovement(tx, { productId: fixture.products.small, type: "SALE", quantity: -7, reason: "test" })
        )
        const sold = await sellThrough(db.prisma, since)
        expect(sold).toContainEqual({ sku: "nl-test-5w", unitsSold: 7 })
    })

    it("lists dead stock, ignoring the INITIAL movement that seeded it", async () => {
        const dead = await deadStock(db.prisma, new Date(Date.now() - 60_000))
        expect(dead.map((d) => d.sku)).toContain("nl-test-10w")
        expect(dead.map((d) => d.sku)).not.toContain("nl-test-5w")
    })

    it("computes a COD refusal rate, which was not measurable before the RETURN movement", async () => {
        const rate = await codRefusalRate(db.prisma, new Date(0))
        expect(rate).toMatchObject({ delivered: 0, refused: 0, rate: 0 })
        expect(Number.isNaN(rate.rate)).toBe(false)
    })
})
