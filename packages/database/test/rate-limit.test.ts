import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "./harness"
import { consume, sweepRateLimits } from "../rate-limit"

let db: TestDatabase

beforeAll(async () => {
    db = await createTestDatabase()
})
afterAll(async () => db?.drop())
beforeEach(async () => {
    await db.prisma.rateLimit.deleteMany()
})

describe("rate limiting", () => {
    it("allows up to the limit and refuses the next one", async () => {
        const results = []
        for (let i = 0; i < 4; i++) results.push(await consume(db.prisma, "contact:1.2.3.4", 3, 60))

        expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
        expect(results.map((r) => r.count)).toEqual([1, 2, 3, 4])
    })

    it("counts each key separately", async () => {
        for (let i = 0; i < 3; i++) await consume(db.prisma, "contact:1.1.1.1", 3, 60)

        const other = await consume(db.prisma, "contact:2.2.2.2", 3, 60)
        expect(other.allowed).toBe(true)
        expect(other.count).toBe(1)
    })

    it("starts a new window once the old one has passed", async () => {
        for (let i = 0; i < 3; i++) await consume(db.prisma, "contact:9.9.9.9", 3, 60)
        expect((await consume(db.prisma, "contact:9.9.9.9", 3, 60)).allowed).toBe(false)

        await db.prisma.$executeRaw`
            UPDATE rate_limits SET "windowStart" = (now() AT TIME ZONE 'UTC') - interval '2 minutes'
            WHERE "key" = 'contact:9.9.9.9'`

        const fresh = await consume(db.prisma, "contact:9.9.9.9", 3, 60)
        expect(fresh.allowed).toBe(true)
        expect(fresh.count).toBe(1)
    })

    it("compares against UTC, not the session timezone (A55)", async () => {
        await db.prisma.rateLimit.create({
            data: {
                key: "contact:tz",
                count: 3,
                windowStart: new Date(Date.now() - 30_000),
            },
        })

        await db.prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE 'Africa/Cairo'`)
            const fourth = await consume(tx, "contact:tz", 3, 60)

            expect(fourth.count).toBe(4)
            expect(fourth.allowed).toBe(false)
        })
    })

    it("sweeps counters whose window closed long ago, and leaves live ones", async () => {
        await consume(db.prisma, "contact:old", 3, 60)
        await consume(db.prisma, "contact:new", 3, 60)
        await db.prisma.$executeRaw`
            UPDATE rate_limits SET "windowStart" = (now() AT TIME ZONE 'UTC') - interval '3 days'
            WHERE "key" = 'contact:old'`

        const deleted = await sweepRateLimits(db.prisma)
        expect(deleted).toBe(1)

        const remaining = await db.prisma.rateLimit.findMany({ select: { key: true } })
        expect(remaining.map((r) => r.key)).toEqual(["contact:new"])
    })
})
