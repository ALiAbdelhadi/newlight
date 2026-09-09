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

/**
 * §17: "a notification row is written in the same transaction as the event; a push service that
 * is down does not fail the event; a notification is pushed at most once."
 *
 * The last of those is the one worth a test. It is a property of the CLAIM — an
 * `UPDATE … RETURNING` that stamps `pushedAt` before anything is sent — and it is invisible in
 * the code of any single call site.
 */
let db: TestDatabase

/**
 * The keys are shaped correctly but the endpoint is not real, so `sendPush` fails without a
 * network call. That is what these tests want: they are about the claim and the row, not about
 * Google's availability.
 */
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
    // Without these the sweep refuses to claim anything, which is correct behaviour and
    // exactly what the "not configured" test below asserts — so it sets them per test instead.
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
    // Users too. `adminRecipients` returns every ADMIN in the database, so administrators
    // left behind by an earlier test are administrators this one notifies.
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

        // No notification for an order that does not exist.
        expect(await db.prisma.notification.count()).toBe(0)
    })

    it("resolves recipients by role and not by address", async () => {
        const first = await admin("ADMIN")
        const second = await admin("SUPER_ADMIN")
        // A customer is not an administrator, however many orders they have placed.
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
        /*
         * The property the SERIALIZABLE order transaction depends on. `notifyRecipients` must
         * not consult the users table — if it filtered, or re-derived the audience, it would
         * take the predicate lock this split exists to avoid. An id belonging to a CUSTOMER is
         * the probe: the write must honour it rather than quietly drop it.
         */
        const customer = await db.prisma.user.create({
            data: { email: `probe${Date.now()}@x.invalid`, name: "Probe", role: "CUSTOMER" },
        })
        await admin("SUPER_ADMIN") // exists, and must NOT appear: it was not in the list

        const result = await db.prisma.$transaction((tx) =>
            notifyRecipients(tx, [customer.id], { type: "SYSTEM_ALERT", title: "t", message: "m" })
        )

        expect(result.created).toBe(1)
        const rows = await db.prisma.notification.findMany({ select: { userId: true } })
        expect(rows.map((r) => r.userId)).toEqual([customer.id])
    })

    it("does not fail the event when there is no administrator to notify", async () => {
        // A fresh installation. Failing a customer's order over a seeding problem would be
        // the wrong end of the system to break.
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

        // The property. A second sweep — a retry, a concurrent instance, a cron tick landing
        // on top of the immediate dispatch — must find nothing.
        expect(await dispatchPush(db.prisma)).toMatchObject({ claimed: 0 })
    })

    it("stamps a stale notification without sending it", async () => {
        const user = await admin()
        await saveSubscription(db.prisma, { userId: user.id, endpoint: endpointFor(user.id), ...KEYS })

        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "LOW_INVENTORY", title: "t", message: "m" }))
        // Older than the one-hour window: it belongs in the bell, not on somebody's phone.
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
            // Still unpushed, so a deploy that adds the keys delivers it rather than losing it.
            expect(await db.prisma.notification.count({ where: { pushedAt: null } })).toBe(1)
        })
    })

    it("does not stamp an OLD notification either when VAPID is not configured", async () => {
        // The regression this exists for: the stale-stamping UPDATE used to run BEFORE the
        // configuration check, so an unconfigured deployment quietly swallowed every
        // notification that aged past the window while the keys were missing — exactly the
        // ones the operator turns push on to stop missing.
        const user = await admin()
        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "NEW_ORDER", title: "t", message: "m" }))
        await db.prisma.notification.updateMany({ data: { createdAt: new Date(Date.now() - 6 * 3600_000) } })

        await withoutVapid(async () => {
            expect(await dispatchPush(db.prisma)).toMatchObject({ claimed: 0, skippedStale: 0 })
        })

        // Untouched, and therefore still deliverable by the deploy that adds the keys.
        expect(await db.prisma.notification.count({ where: { pushedAt: null } })).toBe(1)
    })

    it("counts a transport failure without deleting the subscription", async () => {
        const user = await admin()
        await saveSubscription(db.prisma, { userId: user.id, endpoint: endpointFor(user.id), ...KEYS })
        await db.prisma.$transaction((tx) => notifyUser(tx, user.id, { type: "SYSTEM_ALERT", title: "t", message: "m" }))

        const summary = await dispatchPush(db.prisma)
        expect(summary.failed).toBe(1)
        // A failure that never said "gone" is not proof the endpoint is dead. Deleting on one
        // would silently unsubscribe every admin the first time a key is rotated badly.
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

        // Two rows for one browser is one notification arriving twice.
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

        // A cancellation carries the customer's own reason, and nothing upstream bounds it.
        const reason = "why ".repeat(3000)
        await db.prisma.$transaction((tx) =>
            notifyUser(tx, user.id, { type: "ORDER_CANCELLED", title: "Order NL-1 cancelled", message: reason })
        )

        // Reaching the transport at all is the assertion: an oversized payload is rejected by
        // the push service before it is encrypted, which would show up here as claimed:1 with
        // a failure whose message is about size rather than about the endpoint.
        const summary = await dispatchPush(db.prisma)
        expect(summary.claimed).toBe(1)

        // The row keeps the full text; only the banner is clipped. The bell shows everything.
        const row = await db.prisma.notification.findFirst()
        expect(row?.message.length).toBe(reason.length)
    })
})
