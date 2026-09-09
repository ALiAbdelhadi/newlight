/**
 * @repo/notifications — the only way anything in this repository raises a notification.
 *
 * The design mirrors @repo/mail's outbox, and for the same reason. Two operations, deliberately
 * on opposite sides of a commit:
 *
 *   adminRecipients()          runs BEFORE the transaction — see the note on why.
 *   notifyRecipients(tx, …)    runs INSIDE the caller's transaction, alongside the business event.
 *   dispatchPush()             runs after, and from a cron sweep.
 *
 * An order that commits always has its notification row — there is no window where the order
 * exists and the admin has no record of it — and a push service that is unreachable cannot roll
 * back an order, because by the time anything is sent the order is already committed.
 *
 * The row is the durable half and the bell reads it. The push is a best-effort nudge toward a
 * row that already exists. When push is not configured at all, everything here still works and
 * the admin simply finds the notification the next time they look, which is exactly the
 * behaviour that existed before this package.
 */
import type { Prisma, PrismaClient, NotificationPriority, NotificationType } from "@repo/database"
import { sendPush, isPushConfigured } from "./push"
import type { NotificationInput, PushPayload } from "./types"

export * from "./types"
export { isPushConfigured, publicVapidKey, vapidConfigFromEnv } from "./push"
export type { WebPushTarget, VapidConfig } from "./push"

/** The roles that receive an operational notification. Not an env var: it is a domain fact. */
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const

/**
 * A sweep that has been down overnight must not wake every administrator with fifty pushes for
 * work that is already on their screen. Rows older than this are stamped as handled without
 * being sent — they are still in the bell, which is where a day-old notification belongs.
 */
const PUSH_STALE_AFTER_MINUTES = 60

/**
 * A subscription that fails this many times CONSECUTIVELY, with a status that never said
 * "gone", is stale in practice: a push service that answers 5xx for two days is not coming
 * back for that endpoint. Reset to zero by any success.
 */
const MAX_CONSECUTIVE_FAILURES = 10

/**
 * Who receives an operational notification. Read this BEFORE opening the transaction.
 *
 * Split from the write on purpose, and the reason is specific rather than stylistic.
 *
 * This was one function that read the administrators and wrote their rows, both inside the
 * caller's transaction. Order creation runs at SERIALIZABLE — the only transaction in the
 * repository that does — and `EXPLAIN` on this query is a **Seq Scan**, not an index scan: the
 * planner ignores `@@index([role])` because `users` is small, and it will keep ignoring it
 * while the administrators are a handful of rows among the customers. Postgres locks a
 * sequential scan under SSI at RELATION granularity, so reading it inside that transaction put
 * a predicate lock on the WHOLE `users` table for the duration of every checkout.
 *
 * A single rw-dependency is not an abort on its own — SSI needs a full dangerous structure —
 * so this was measured rather than assumed. Against a concurrent transaction that reads
 * `notifications` and writes `users`, the cycle closes and one of the pair dies with a
 * serialization failure. In the run, the one that died was the SIGN-UP, not the order: the
 * order committed and the customer creating an account got the error. Which side loses depends
 * on the interleaving, and neither of them should have been abortable by the other.
 *
 * No current code path forms exactly that cycle, so this is prophylactic rather than a fix for
 * an observed outage. It is still worth doing, because outside the transaction the same query
 * takes no predicate lock at all — the class is removed at no cost. What it costs instead is
 * that an administrator created in the milliseconds between this read and the commit misses
 * that one notification, which is the right thing to trade.
 *
 * By ROLE, never by address. The version this descends from looked up a single user by
 * `process.env.ADMIN_EMAIL` and returned silently when nothing matched, so a second
 * administrator — or a changed address — meant notifications that went nowhere (A34).
 */
export async function adminRecipients(prisma: PrismaClient): Promise<string[]> {
    const admins = await prisma.user.findMany({
        where: { role: { in: [...ADMIN_ROLES] } },
        select: { id: true },
    })
    return admins.map((admin) => admin.id)
}

/**
 * Write one notification per recipient, inside the caller's transaction.
 *
 *   const recipients = await adminRecipients(prisma)
 *   await prisma.$transaction(async (tx) => {
 *       const order = await tx.order.create({ … })
 *       await notifyRecipients(tx, recipients, { type: "NEW_ORDER", … })
 *       return order
 *   })
 *
 * A pure write. It reads nothing, which is what makes it safe at any isolation level — and is
 * why there is no convenience wrapper that resolves the recipients for you. A wrapper that
 * happened to be correct at READ COMMITTED and quietly wrong at SERIALIZABLE is the footgun
 * this split exists to remove, so it is not offered.
 */
export async function notifyRecipients(
    tx: Prisma.TransactionClient,
    recipients: readonly string[],
    input: NotificationInput
): Promise<{ created: number }> {
    if (recipients.length === 0) {
        // Not thrown. An installation with no administrator is a seeding problem, and failing
        // a customer's order over it would be the wrong end of the system to break.
        console.warn(`[notifications] no recipients; ${input.type} notification not written.`)
        return { created: 0 }
    }

    await tx.notification.createMany({ data: recipients.map((userId) => rowFor(userId, input)) })
    return { created: recipients.length }
}

/** One notification for one person. Same transaction discipline. */
export async function notifyUser(
    tx: Prisma.TransactionClient,
    userId: string,
    input: NotificationInput
): Promise<{ created: number }> {
    await tx.notification.create({ data: rowFor(userId, input) })
    return { created: 1 }
}

function rowFor(userId: string, input: NotificationInput) {
    return {
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl ?? null,
        priority: input.priority ?? ("NORMAL" as NotificationPriority),
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        expiresAt: input.expiresAt ?? null,
    }
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export interface SaveSubscriptionInput {
    userId: string
    endpoint: string
    p256dh: string
    auth: string
    userAgent?: string | null
}

/**
 * Upsert on `endpoint`, not on `(userId, endpoint)`.
 *
 * The endpoint identifies a BROWSER, and a browser can be signed in as a different
 * administrator than the last time it subscribed. Keying on the endpoint alone means the row
 * moves to the new user, which is correct: whoever is signed in on that machine is who should
 * receive its notifications. Keying on the pair would leave the previous administrator's
 * subscription alive on a machine they no longer use.
 */
export async function saveSubscription(
    prisma: PrismaClient,
    input: SaveSubscriptionInput
): Promise<{ id: string }> {
    const row = await prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
            userId: input.userId,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            auth: input.auth,
            userAgent: input.userAgent ?? null,
        },
        update: {
            userId: input.userId,
            p256dh: input.p256dh,
            auth: input.auth,
            userAgent: input.userAgent ?? null,
            failureCount: 0,
        },
        select: { id: true },
    })
    return row
}

/**
 * Scoped to the user, so posting somebody else's endpoint cannot unsubscribe them. Returns
 * the count rather than throwing on zero: unsubscribing something already gone is a success
 * from the caller's point of view.
 */
export async function removeSubscription(
    prisma: PrismaClient,
    userId: string,
    endpoint: string
): Promise<{ removed: number }> {
    const result = await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } })
    return { removed: result.count }
}

export async function listSubscriptions(prisma: PrismaClient, userId: string) {
    return prisma.pushSubscription.findMany({
        where: { userId },
        select: { id: true, endpoint: true, userAgent: true, createdAt: true, lastSuccessAt: true },
        orderBy: { createdAt: "desc" },
    })
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

export interface PushSummary {
    claimed: number
    /** Endpoints the push service accepted. One notification can produce several. */
    delivered: number
    /** Endpoints deleted because the push service said 404 or 410. */
    pruned: number
    failed: number
    /** Rows stamped without sending, because they were older than the staleness window. */
    skippedStale: number
}

interface ClaimedRow {
    id: string
    userId: string
    type: NotificationType
    title: string
    message: string
    actionUrl: string | null
    priority: NotificationPriority
    createdAt: Date
}

/**
 * Push whatever has not been pushed.
 *
 * Safe to run concurrently, and safe to run beside the request that wrote the row: claiming is
 * a single `UPDATE … RETURNING` that stamps `pushedAt`, guarded by `FOR UPDATE SKIP LOCKED`,
 * so two sweeps cannot pick up the same notification and deliver it twice.
 *
 * The stamp goes on BEFORE the send, not after. That trades a lost push on a crash for a
 * guarantee against a duplicate one, which is the right way round here: the row is still in
 * the bell either way, and being told twice about the same order erodes trust in the channel
 * faster than being told once, late.
 */
export async function dispatchPush(prisma: PrismaClient, limit = 50): Promise<PushSummary> {
    const summary: PushSummary = { claimed: 0, delivered: 0, pruned: 0, failed: 0, skippedStale: 0 }

    /*
     * The configuration check comes FIRST, before anything writes.
     *
     * It used to come second, after the stale-stamping below, and that was a data-loss bug
     * rather than an ordering preference: on a deployment with no VAPID pair the sweep still
     * ran every two minutes and still stamped every notification older than an hour as
     * handled. Adding the keys a week later would then deliver nothing that had aged past the
     * window while they were missing — precisely the notifications the operator was turning
     * push on to stop missing.
     *
     * Unconfigured now means the sweep does NOTHING. Every row stays unpushed, and the deploy
     * that adds the keys delivers whatever is still inside the window and stamps the rest.
     */
    if (!isPushConfigured()) return summary

    // Anything older than the window is marked handled without being sent. Done before the
    // claim so a long backlog cannot crowd out the notifications that are actually current.
    //
    // `now() AT TIME ZONE 'UTC'` rather than a bare now(): these columns are
    // `timestamp WITHOUT time zone` and Prisma writes UTC into them, so comparing against a
    // timestamptz coerces through the SESSION timezone — on a server set to Africa/Cairo that
    // is a silent three-hour error, which is exactly the defect A55 documents in the mail
    // sweep.
    summary.skippedStale = await prisma.$executeRaw`
        UPDATE "notifications"
           SET "pushedAt" = (now() AT TIME ZONE 'UTC')
         WHERE "pushedAt" IS NULL
           AND "createdAt" < (now() AT TIME ZONE 'UTC') - make_interval(mins => ${PUSH_STALE_AFTER_MINUTES}::int)`

    const claimed = await prisma.$queryRaw<ClaimedRow[]>`
        UPDATE "notifications"
           SET "pushedAt" = (now() AT TIME ZONE 'UTC'), "updatedAt" = (now() AT TIME ZONE 'UTC')
         WHERE id IN (
               SELECT id FROM "notifications"
                WHERE "pushedAt" IS NULL
                ORDER BY "createdAt"
                LIMIT ${limit}
                FOR UPDATE SKIP LOCKED
         )
        RETURNING id, "userId", type, title, message, "actionUrl", priority, "createdAt"`

    summary.claimed = claimed.length
    if (claimed.length === 0) return summary

    // One query for every recipient's endpoints rather than one per notification: a new order
    // writes a row per administrator, and three administrators should not mean three
    // round-trips for the same table.
    const userIds = [...new Set(claimed.map((row) => row.userId))]
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true, failureCount: true },
    })

    const byUser = new Map<string, typeof subscriptions>()
    for (const subscription of subscriptions) {
        const list = byUser.get(subscription.userId)
        if (list) list.push(subscription)
        else byUser.set(subscription.userId, [subscription])
    }

    const doomed: string[] = []

    for (const row of claimed) {
        const targets = byUser.get(row.userId)
        if (!targets || targets.length === 0) continue

        /*
         * Truncated, because a Web Push message is capped at about 4KB and one field here is
         * not written by us: a cancellation carries the customer's own reason. A payload over
         * the cap is rejected by the push service, so an unusually talkative customer would
         * silently suppress the notification about their own cancellation — the one case where
         * it matters most. A banner cannot show this much text anyway.
         */
        const payload: PushPayload = {
            notificationId: row.id,
            type: row.type,
            title: clamp(row.title, 120),
            body: clamp(row.message, 400),
            url: row.actionUrl,
            priority: row.priority,
            at: row.createdAt.getTime(),
        }

        const outcomes = await Promise.all(
            targets.map(async (target) => ({
                target,
                outcome: await sendPush(
                    { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
                    payload
                ),
            }))
        )

        for (const { target, outcome } of outcomes) {
            if (outcome.ok) {
                summary.delivered++
                // failureCount is CONSECUTIVE failures, so any success resets it. Writing 0
                // over a 0 costs nothing and is one branch fewer to get wrong.
                // updateMany, not update: `update` throws P2025 when the row is gone, and it
                // can be gone — an administrator clicking "off" mid-sweep deletes it. That
                // exception would take down the whole sweep and lose every row it had already
                // claimed and stamped. A write that matches nothing is the correct outcome here.
                await prisma.pushSubscription.updateMany({
                    where: { id: target.id },
                    data: { failureCount: 0, lastSuccessAt: new Date() },
                })
                continue
            }

            summary.failed++
            if (outcome.gone || target.failureCount + 1 >= MAX_CONSECUTIVE_FAILURES) {
                doomed.push(target.id)
                continue
            }
            await prisma.pushSubscription.updateMany({
                where: { id: target.id },
                data: { failureCount: { increment: 1 } },
            })
            console.warn(`[push] ${row.type} to ${redact(target.endpoint)} failed: ${outcome.error}`)
        }
    }

    if (doomed.length > 0) {
        const deleted = await prisma.pushSubscription.deleteMany({ where: { id: { in: doomed } } })
        summary.pruned = deleted.count
    }

    return summary
}

/**
 * Fire the sweep without making the caller wait for it, and without letting it take the caller
 * down. For use immediately after a business transaction commits, so an administrator hears
 * about an order in a second rather than at the next cron tick.
 *
 * Deliberately not awaited by callers, and deliberately swallowing its own errors: this is a
 * latency optimisation over a sweep that will run anyway. If the process is torn down first —
 * which on serverless it may well be — the notification is still unpushed in the table and the
 * next tick picks it up. That is the whole reason the sweep exists.
 */
export function dispatchPushSoon(prisma: PrismaClient, limit = 50): void {
    void dispatchPush(prisma, limit).catch((error) => {
        console.error("[push] immediate dispatch failed; the cron sweep will retry:", error)
    })
}

/** Cut on a whole word where one is near the end; an ellipsis mid-word reads as corruption. */
function clamp(text: string, max: number): string {
    if (text.length <= max) return text
    const cut = text.slice(0, max - 1)
    const space = cut.lastIndexOf(" ")
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** Endpoints are long, unique, and identify a device. Logs get the tail only. */
function redact(endpoint: string): string {
    return `…${endpoint.slice(-12)}`
}
