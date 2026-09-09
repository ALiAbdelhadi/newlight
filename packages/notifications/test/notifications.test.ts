import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"

import {
    adminRecipients,
    dispatchPush,
    notifyRecipients,
    notifyUser,
    removeSubscription,
    saveSubscription,
} from "../index"
import { __resetPushTransportForTesting } from "../push"

let db: TestDatabase

const KEYS = {
    p256dh: "BEd3lPRCyIaKoNRxvvBsCB4Zjt5EhOOhP8p6MbcJ7Mrsc9rj1CVzUZLZ2sZlbUwSNoXVo4zGvHMkH3F0ykt2GLo",
    auth: "k8JV6sIkFcXbHV0k4bOtEQ",
}

let counter = 0
async function admin(role: "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
    return db.prisma.user.create({
        data: { email: `admin${counter++}-${Date.now()}@x.invalid`, name: "Admin", role },
    })
}

beforeAll(async () => {
    db = await createTestDatabase()
    process.env.VAPID_PUBLIC_KEY = "BEJddNQGs0aTm0kMnpJgR15MuIu46V7Y_5-YwxfkB25X-xLbxGKsG4SzHrbBM4RQP5nRQ2fVOnpZBmCFzFECgWk"
    process.env.VAPID_PRIVATE_KEY = "sJHR7oTaJHYSHXQ7lxbmXWDCqUJqYFeCPDaZQnQFqEo"
    process.env.VAPID_SUBJECT = "mailto:test@x.invalid"
})
afterAll(async () => {
    __resetPushTransportForTesting()
    await db?.drop()
})
beforeEach(async () => {
    await db.prisma.pushSubscription.deleteMany()
    await db.prisma.notification.deleteMany()
    await db.prisma.user.deleteMany()
})

describe("writing inside the business transaction", () => {
    it("rolls the notification back with the event that caused it", async () => {
        const recipients = [(await admin()).id]

        await expect(
            db.prisma.$transaction(async (tx) => {
                await notifyRecipients(tx, recipients, { type: "NEW_ORDER", title: "t", message: "m" })
                throw new Error("business event failed")
            })
        ).rejects.toThrow("business event failed")

        expect(await db.prisma.notification.count()).toBe(0)
    })

    it("resolves recipients by role and not by address", async () => {
        const first = await admin("ADMIN")
        const second = await admin("SUPER_ADMIN")
        await db.prisma.user.create({ data: { email: `c${Date.now()}@x.invalid`, name: "C", role: "CUSTOMER" } })

        expect((await adminRecipients(db.prisma)).sort()).toEqual([first.id, second.id].sort())
    })

    it("writes one row per recipient", async () => {
        await admin("ADMIN")
        await admin("SUPER_ADMIN")
        const recipients = await adminRecipients(db.prisma)

        const result = await db.prisma.$transaction((tx) =>
            notifyRecipients(tx, recipients, { type: "NEW_ORDER", title: "Order NL-1", message: "m", priority: "HIGH" })
        )

        expect(result.created).toBe(2)
        expect(await db.prisma.notification.count({ where: { priority: "HIGH" } })).toBe(2)
    })

    it("writes for exactly the ids it is given, reading nothing", async () => {
        const customer = await db.prisma.user.create({
            data: { email: `probe${Date.now()}@x.invalid`, name: "Probe", role: "CUSTOMER" },
        })
        await admin("SUPER_ADMIN")

        const result = await db.prisma.$transaction((tx) =>
            notifyRecipients(tx, [customer.id], { type: "SYSTEM_ALERT", title: "t", message: "m" })
        )

        expect(result.created).toBe(1)
        const rows = await db.prisma.notification.findMany({ select: { userId: true } })
        expect(rows.map((r) => r.userId)).toEqual([customer.id])
    })

    it("does not fail the event when there is no administrator to notify", async () => {
        const recipients = await adminRecipients(db.prisma)
        expect(recipients).toEqual([])

        const result = await db.prisma.$transaction((tx) =>
            notifyRecipients(tx, recipients, { type: "NEW_ORDER", title: "t", message: "m" })
        )
        expect(result.created).toBe(0)
    })
})

describe("the sweep pushes each notification at most once", () => {
    it("claims a row, stamps it, and never claims it again", async () => {
        const user = await admin()
        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "SYSTEM_ALERT", title: "t", message: "m" }))

        const first = await dispatchPush(db.prisma)
        expect(first.claimed).toBe(1)
        expect(await db.prisma.notification.count({ where: { pushedAt: null } })).toBe(0)

        expect(await dispatchPush(db.prisma)).toMatchObject({ claimed: 0 })
    })

    it("stamps a stale notification without sending it", async () => {
        const user = await admin()
        await saveSubscription(db.prisma, { userId: user.id, endpoint: endpointFor(user.id), ...KEYS })

        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "LOW_INVENTORY", title: "t", message: "m" }))
        await db.prisma.notification.updateMany({ data: { createdAt: new Date(Date.now() - 3 * 60 * 60_000) } })

        const summary = await dispatchPush(db.prisma)
        expect(summary.skippedStale).toBe(1)
        expect(summary.claimed).toBe(0)
        expect(await db.prisma.notification.count({ where: { pushedAt: null } })).toBe(0)
    })

    it("claims nothing at all when VAPID is not configured", async () => {
        const user = await admin()
        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "SYSTEM_ALERT", title: "t", message: "m" }))

        await withoutVapid(async () => {
            expect(await dispatchPush(db.prisma)).toMatchObject({ claimed: 0 })
            expect(await db.prisma.notification.count({ where: { pushedAt: null } })).toBe(1)
        })
    })

    it("does not stamp an OLD notification either when VAPID is not configured", async () => {
        const user = await admin()
        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "NEW_ORDER", title: "t", message: "m" }))
        await db.prisma.notification.updateMany({ data: { createdAt: new Date(Date.now() - 6 * 3600_000) } })

        await withoutVapid(async () => {
            expect(await dispatchPush(db.prisma)).toMatchObject({ claimed: 0, skippedStale: 0 })
        })

        expect(await db.prisma.notification.count({ where: { pushedAt: null } })).toBe(1)
    })

    it("counts a transport failure without deleting the subscription", async () => {
        const user = await admin()
        await saveSubscription(db.prisma, { userId: user.id, endpoint: endpointFor(user.id), ...KEYS })
        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "SYSTEM_ALERT", title: "t", message: "m" }))

        const summary = await dispatchPush(db.prisma)
        expect(summary.failed).toBe(1)
        expect(summary.pruned).toBe(0)
        expect(await db.prisma.pushSubscription.count()).toBe(1)
    })
})

describe("subscriptions", () => {
    it("re-subscribing the same browser updates the row rather than adding one", async () => {
        const user = await admin()
        const endpoint = endpointFor(user.id)

        await saveSubscription(db.prisma, { userId: user.id, endpoint, ...KEYS, userAgent: "Chrome" })
        await saveSubscription(db.prisma, { userId: user.id, endpoint, ...KEYS, userAgent: "Chrome 2" })

        expect(await db.prisma.pushSubscription.count()).toBe(1)
        expect((await db.prisma.pushSubscription.findFirst())?.userAgent).toBe("Chrome 2")
    })

    it("moves the endpoint when a different administrator signs in on that machine", async () => {
        const first = await admin()
        const second = await admin()
        const endpoint = endpointFor(first.id)

        await saveSubscription(db.prisma, { userId: first.id, endpoint, ...KEYS })
        await saveSubscription(db.prisma, { userId: second.id, endpoint, ...KEYS })

        expect(await db.prisma.pushSubscription.count()).toBe(1)
        expect((await db.prisma.pushSubscription.findFirst())?.userId).toBe(second.id)
    })

    it("will not let one administrator unsubscribe another", async () => {
        const owner = await admin()
        const stranger = await admin()
        const endpoint = endpointFor(owner.id)
        await saveSubscription(db.prisma, { userId: owner.id, endpoint, ...KEYS })

        expect(await removeSubscription(db.prisma, stranger.id, endpoint)).toMatchObject({ removed: 0 })
        expect(await removeSubscription(db.prisma, owner.id, endpoint)).toMatchObject({ removed: 1 })
    })

    it("goes away with the user, because a deleted user's endpoints are dead mail", async () => {
        const user = await admin()
        await saveSubscription(db.prisma, { userId: user.id, endpoint: endpointFor(user.id), ...KEYS })

        await db.prisma.user.delete({ where: { id: user.id } })
        expect(await db.prisma.pushSubscription.count()).toBe(0)
    })
})

async function withoutVapid(body: () => Promise<void>): Promise<void> {
    const saved = process.env.VAPID_PRIVATE_KEY
    delete process.env.VAPID_PRIVATE_KEY
    try {
        await body()
    } finally {
        process.env.VAPID_PRIVATE_KEY = saved
    }
}

function endpointFor(seed: string): string {
    return `https://fcm.googleapis.com/fcm/send/${seed}-${counter++}`
}

describe("the push payload stays under the 4KB cap", () => {
    it("truncates a message the customer wrote", async () => {
        const user = await admin()
        await saveSubscription(db.prisma, { userId: user.id, endpoint: endpointFor(user.id), ...KEYS })

        const reason = "why ".repeat(3000)
        await db.prisma.$transaction((tx) =>
            notifyUser(tx, user.id, { type: "ORDER_CANCELLED", title: "Order NL-1 cancelled", message: reason })
        )

        const summary = await dispatchPush(db.prisma)
        expect(summary.claimed).toBe(1)

        const row = await db.prisma.notification.findFirst()
        expect(row?.message.length).toBe(reason.length)
    })
})
