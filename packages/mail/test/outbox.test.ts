import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import { __setTransportForTesting, MailTransportError, type MailInput, type MailTransport } from "../index"
import { dispatchOutbox, queueMail, sendOrQueue, MAX_ATTEMPTS } from "../outbox"
import type { OrderConfirmationPayload } from "../templates/payloads"

let db: TestDatabase

function recordingTransport(behaviour: "ok" | "retryable" | "permanent") {
    const sent: MailInput[] = []
    const transport: MailTransport = {
        name: `test-${behaviour}`,
        async send(input) {
            sent.push(input)
            if (behaviour === "retryable") throw new MailTransportError("503 upstream", 503, true)
            if (behaviour === "permanent") throw new MailTransportError("422 bad address", 422, false)
            return { id: `msg-${sent.length}`, provider: "test" }
        },
    }
    return { transport, sent }
}

const PAYLOAD: OrderConfirmationPayload = {
    orderNumber: "NL-1",
    items: [{ name: "x", quantity: 1, price: "10.00" }],
    subtotal: "10.00", shippingCost: "0.00", total: "10.00", currency: "EGP",
    address: { fullName: "a", phone: "b", addressLine1: "c", city: "d", country: "e" },
    orderUrl: "https://x.invalid",
}

beforeAll(async () => { db = await createTestDatabase() })
afterAll(async () => { __setTransportForTesting(null); await db?.drop() })
beforeEach(async () => { await db.prisma.emailOutbox.deleteMany() })

describe("queueing inside the business transaction", () => {
    it("commits the row with the event, and rolls it back with the event", async () => {
        const user = await db.prisma.user.create({
            data: { email: `a${Date.now()}@x.invalid`, name: "A" },
        })

        await expect(
            db.prisma.$transaction(async (tx) => {
                await queueMail(tx, { template: "contact-acknowledgement", to: user.email, locale: "ar", payload: { fullName: "A" } })
                throw new Error("business event failed")
            })
        ).rejects.toThrow("business event failed")
        expect(await db.prisma.emailOutbox.count()).toBe(0)

        await db.prisma.$transaction(async (tx) => {
            await queueMail(tx, { template: "contact-acknowledgement", to: user.email, locale: "ar", payload: { fullName: "A" } })
        })
        expect(await db.prisma.emailOutbox.count()).toBe(1)
    })

    it("queues one email per dedupeKey however many times the event retries", async () => {
        for (let i = 0; i < 3; i++) {
            await db.prisma.$transaction((tx) =>
                queueMail(tx, {
                    template: "order-confirmation", to: "a@x.invalid", locale: "en",
                    payload: PAYLOAD, dedupeKey: "order-confirmation:o-1",
                })
            )
        }
        expect(await db.prisma.emailOutbox.count()).toBe(1)
    })

    it("does not deduplicate mail that is legitimately repeatable", async () => {
        for (let i = 0; i < 2; i++) {
            await db.prisma.$transaction((tx) =>
                queueMail(tx, {
                    template: "password-reset", to: "a@x.invalid", locale: "en",
                    payload: { resetUrl: "https://x.invalid", expiresInMinutes: 60 },
                })
            )
        }
        expect(await db.prisma.emailOutbox.count()).toBe(2)
    })
})

describe("dispatch", () => {
    it("sends, marks SENT, and does not send again", async () => {
        const { transport, sent } = recordingTransport("ok")
        __setTransportForTesting(transport)

        await db.prisma.$transaction((tx) =>
            queueMail(tx, { template: "order-confirmation", to: "a@x.invalid", locale: "ar", payload: PAYLOAD })
        )

        const first = await dispatchOutbox(db.prisma)
        expect(first).toMatchObject({ claimed: 1, sent: 1, failed: 0 })
        expect(sent).toHaveLength(1)
        expect(sent[0]!.subject).toMatch(/[؀-ۿ]/)

        const row = await db.prisma.emailOutbox.findFirstOrThrow()
        expect(row.status).toBe("SENT")
        expect(row.sentAt).not.toBeNull()

        expect(await dispatchOutbox(db.prisma)).toMatchObject({ claimed: 0 })
        expect(sent).toHaveLength(1)
    })

    it("backs off a retryable failure instead of hammering", async () => {
        __setTransportForTesting(recordingTransport("retryable").transport)
        await db.prisma.$transaction((tx) =>
            queueMail(tx, { template: "order-confirmation", to: "a@x.invalid", locale: "en", payload: PAYLOAD })
        )

        const result = await dispatchOutbox(db.prisma)
        expect(result).toMatchObject({ sent: 0, retrying: 1, failed: 0 })

        const row = await db.prisma.emailOutbox.findFirstOrThrow()
        expect(row.status).toBe("PENDING")
        expect(row.attempts).toBe(1)
        expect(row.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now())
        expect(row.lastError).toContain("503")

        expect(await dispatchOutbox(db.prisma)).toMatchObject({ claimed: 0 })
    })

    it("gives up on a permanent failure rather than scheduling six identical ones", async () => {
        __setTransportForTesting(recordingTransport("permanent").transport)
        await db.prisma.$transaction((tx) =>
            queueMail(tx, { template: "order-confirmation", to: "not-an-address", locale: "en", payload: PAYLOAD })
        )

        expect(await dispatchOutbox(db.prisma)).toMatchObject({ sent: 0, retrying: 0, failed: 1 })
        const row = await db.prisma.emailOutbox.findFirstOrThrow()
        expect(row.status).toBe("FAILED")
        expect(row.attempts).toBe(1)
        expect(row.attempts).toBeLessThan(MAX_ATTEMPTS)
    })

    it("treats an unrenderable template as permanent, not retryable", async () => {
        __setTransportForTesting(recordingTransport("ok").transport)
        await db.prisma.emailOutbox.create({
            data: { template: "no-such-template", to: "a@x.invalid", locale: "en", payload: {} },
        })
        expect(await dispatchOutbox(db.prisma)).toMatchObject({ failed: 1, retrying: 0 })
    })
})

describe("sendOrQueue", () => {
    it("sends immediately and stores nothing when the transport is healthy", async () => {
        const { transport, sent } = recordingTransport("ok")
        __setTransportForTesting(transport)

        const result = await sendOrQueue(db.prisma, {
            template: "email-verification", to: "a@x.invalid", locale: "ar",
            payload: { verifyUrl: "https://x.invalid", expiresInMinutes: 60 },
        })

        expect(result).toEqual({ delivered: true, queued: false })
        expect(sent).toHaveLength(1)
        expect(await db.prisma.emailOutbox.count()).toBe(0)
    })

    it("falls back to the outbox on a retryable failure", async () => {
        __setTransportForTesting(recordingTransport("retryable").transport)
        const result = await sendOrQueue(db.prisma, {
            template: "email-verification", to: "a@x.invalid", locale: "en",
            payload: { verifyUrl: "https://x.invalid", expiresInMinutes: 60 },
        })
        expect(result).toEqual({ delivered: false, queued: true })
        expect(await db.prisma.emailOutbox.count()).toBe(1)
    })

    it("does not queue a permanent failure", async () => {
        __setTransportForTesting(recordingTransport("permanent").transport)
        const result = await sendOrQueue(db.prisma, {
            template: "email-verification", to: "bad", locale: "en",
            payload: { verifyUrl: "https://x.invalid", expiresInMinutes: 60 },
        })
        expect(result).toEqual({ delivered: false, queued: false })
        expect(await db.prisma.emailOutbox.count()).toBe(0)
    })
})

describe("a failing transport never fails the business event (§16)", () => {
    it("commits the order even when every send throws", async () => {
        __setTransportForTesting(recordingTransport("retryable").transport)
        const user = await db.prisma.user.create({ data: { email: `b${Date.now()}@x.invalid`, name: "B" } })

        const order = await db.prisma.$transaction(async (tx) => {
            const created = await tx.order.create({
                data: {
                    userId: user.id, orderNumber: `O-${Date.now()}`, idempotencyKey: `k-${Date.now()}`,
                    subtotal: "10.00", shippingCost: "0.00", total: "10.00",
                },
                select: { id: true },
            })
            await queueMail(tx, {
                template: "order-confirmation", to: user.email, locale: "ar",
                payload: PAYLOAD, dedupeKey: `order-confirmation:${created.id}`,
            })
            return created
        })

        await dispatchOutbox(db.prisma)
        expect(await db.prisma.order.count({ where: { id: order.id } })).toBe(1)
        expect(await db.prisma.emailOutbox.count({ where: { status: "PENDING" } })).toBe(1)
    })
})
