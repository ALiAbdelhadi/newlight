import type { Prisma, PrismaClient } from "@repo/database"
import { renderTemplate } from "./templates/index"
import type { PayloadByTemplate } from "./templates/payloads"
import { sendMail } from "./index"
import type { MailLocale, MailTemplate } from "./types"

const BACKOFF_MINUTES = [1, 5, 15, 60, 360]
export const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1

export interface QueueMailInput<T extends MailTemplate> {
    template: T
    to: string
    locale: MailLocale
    payload: PayloadByTemplate[T]
    dedupeKey?: string
}

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

export async function dispatchOutbox(prisma: PrismaClient, limit = 25): Promise<DispatchSummary> {
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
