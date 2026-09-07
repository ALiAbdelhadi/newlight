/**
 * The transactional outbox.
 *
 * Two operations, deliberately on opposite sides of a commit:
 *
 *   queueMail(tx, …)   runs INSIDE the caller's transaction, alongside the business event.
 *   dispatchOutbox()   runs after, and from a cron sweep.
 *
 * That split is the whole point. An order that commits always has its confirmation queued —
 * there is no window where the order exists and the email does not. And a mail transport that
 * is down cannot roll back an order, because by the time anything is sent the order is
 * already committed.
 *
 * The alternative, sending inside the request, gives you exactly one of those two properties
 * and you do not get to choose which.
 */
import type { Prisma, PrismaClient } from "@repo/database"
import { renderTemplate } from "./templates/index"
import type { PayloadByTemplate } from "./templates/payloads"
import { sendMail } from "./index"
import type { MailLocale, MailTemplate } from "./types"

/** Backoff between attempts, in minutes. After the last one the row is FAILED, not retried forever. */
const BACKOFF_MINUTES = [1, 5, 15, 60, 360]
export const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1

export interface QueueMailInput<T extends MailTemplate> {
    template: T
    to: string
    locale: MailLocale
    payload: PayloadByTemplate[T]
    /**
     * Makes queueing idempotent, e.g. `order-confirmation:${orderId}`. Omit for mail that is
     * legitimately repeatable — a second password-reset request is a new email, not a
     * duplicate of the first.
     */
    dedupeKey?: string
}

/**
 * Queue one email inside the caller's transaction.
 *
 *   await prisma.$transaction(async (tx) => {
 *       const order = await tx.order.create({ … })
 *       await queueMail(tx, { template: "order-confirmation", … })
 *       return order
 *   })
 */
export async function queueMail<T extends MailTemplate>(
    tx: Prisma.TransactionClient,
    input: QueueMailInput<T>
): Promise<{ id: string; deduplicated: boolean }> {
    if (input.dedupeKey) {
        const existing = await tx.emailOutbox.findUnique({ where: { dedupeKey: input.dedupeKey }, select: { id: true } })
        if (existing) return { id: existing.id, deduplicated: true }
    }

    const row = await tx.emailOutbox.create({
        data: {
            template: input.template,
            to: input.to,
            locale: input.locale,
            payload: input.payload as unknown as Prisma.InputJsonValue,
            dedupeKey: input.dedupeKey ?? null,
        },
        select: { id: true },
    })
    return { id: row.id, deduplicated: false }
}

export interface DispatchSummary {
    claimed: number
    sent: number
    retrying: number
    failed: number
}

/**
 * Send whatever is due. Safe to run concurrently: rows are claimed with a single
 * `UPDATE … RETURNING` that moves PENDING to SENDING, so two sweeps cannot pick up the same
 * row and send it twice.
 */
export async function dispatchOutbox(prisma: PrismaClient, limit = 25): Promise<DispatchSummary> {
    // NOTE on `now() AT TIME ZONE 'UTC'` in the claim below.
    //
    // nextAttemptAt and updatedAt are `timestamp(3) WITHOUT time zone`, and Prisma writes UTC
    // into them. A bare now() is a timestamptz, so comparing the two coerces through the
    // SESSION timezone: on a server set to Africa/Cairo every backoff evaluated as three hours
    // in the past, and the sweep retried a failing transport immediately, every time. Caught by
    // a test, not by review — the code reads correctly and the bug lives in the type coercion.
    const claimed = await prisma.$queryRaw<
        Array<{ id: string; template: string; to: string; locale: string; payload: unknown; attempts: number }>
    >`
        UPDATE "email_outbox"
           SET status = 'SENDING', attempts = attempts + 1, "updatedAt" = (now() AT TIME ZONE 'UTC')
         WHERE id IN (
               SELECT id FROM "email_outbox"
                WHERE status = 'PENDING'
                  AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= (now() AT TIME ZONE 'UTC'))
                ORDER BY "createdAt"
                LIMIT ${limit}
                FOR UPDATE SKIP LOCKED
         )
        RETURNING id, template, "to", locale, payload, attempts`

    const summary: DispatchSummary = { claimed: claimed.length, sent: 0, retrying: 0, failed: 0 }

    for (const row of claimed) {
        try {
            const rendered = await renderTemplate(
                row.template as MailTemplate,
                row.locale as MailLocale,
                row.payload as PayloadByTemplate[MailTemplate]
            )
            const outcome = await sendMail({
                to: row.to,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                tags: { template: row.template, outboxId: row.id },
            })

            if (outcome.ok) {
                await prisma.emailOutbox.update({
                    where: { id: row.id },
                    data: { status: "SENT", sentAt: new Date(), lastError: null, nextAttemptAt: null },
                })
                summary.sent++
                continue
            }
            await recordFailure(prisma, row.id, row.attempts, outcome.error, outcome.retryable, summary)
        } catch (error) {
            // A template that cannot render will never render, so it is not retryable.
            await recordFailure(prisma, row.id, row.attempts, error instanceof Error ? error.message : String(error), false, summary)
        }
    }

    return summary
}

async function recordFailure(
    prisma: PrismaClient,
    id: string,
    attempts: number,
    error: string,
    retryable: boolean,
    summary: DispatchSummary
): Promise<void> {
    const exhausted = attempts >= MAX_ATTEMPTS
    if (!retryable || exhausted) {
        await prisma.emailOutbox.update({
            where: { id },
            data: { status: "FAILED", lastError: error, nextAttemptAt: null },
        })
        summary.failed++
        return
    }

    const minutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)]!
    await prisma.emailOutbox.update({
        where: { id },
        data: { status: "PENDING", lastError: error, nextAttemptAt: new Date(Date.now() + minutes * 60_000) },
    })
    summary.retrying++
}

/**
 * Send now; queue only if that fails.
 *
 * The right shape for mail a person is waiting on — a verification link, a password reset.
 * Going through the outbox alone would mean the customer stares at a sign-up screen until the
 * next cron tick, which for a one-minute sweep is a bad sign-up and for a five-minute one is
 * an abandoned one.
 *
 * So: try the transport. On success, nothing is stored — there is no business event to tie it
 * to and no reason to keep a copy. On a RETRYABLE failure, fall back to the outbox so the
 * sweep finishes the job. On a permanent failure — a malformed address — queueing would just
 * schedule six identical failures, so it returns false and lets the caller decide.
 */
export async function sendOrQueue<T extends MailTemplate>(
    prisma: PrismaClient,
    input: QueueMailInput<T>
): Promise<{ delivered: boolean; queued: boolean }> {
    const rendered = await renderTemplate(input.template, input.locale, input.payload)
    const outcome = await sendMail({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: { template: input.template },
    })

    if (outcome.ok) return { delivered: true, queued: false }
    if (!outcome.retryable) {
        console.error(`[mail] permanent failure for ${input.template} to ${input.to}; not queued: ${outcome.error}`)
        return { delivered: false, queued: false }
    }

    await prisma.$transaction((tx) => queueMail(tx, input))
    console.warn(`[mail] ${input.template} to ${input.to} failed and was queued for retry: ${outcome.error}`)
    return { delivered: false, queued: true }
}
