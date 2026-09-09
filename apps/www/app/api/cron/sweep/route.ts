import { NextResponse, type NextRequest } from "next/server"
import { prisma, sweepExpiredReservations, sweepRateLimits } from "@repo/database"
import { dispatchOutbox } from "@repo/mail/outbox"
import { dispatchPush, isPushConfigured } from "@repo/notifications"

import { authorizeCron } from "@/lib/cron-auth"

/**
 * Every sweep behind one URL — the schedule, inverted.
 *
 * The three sweeps each had their own cron entry in vercel.json, which is the right shape when
 * the platform will run three schedules at two-minute granularity. On the Hobby plan it will
 * not: two cron jobs, once a day. Rather than drop two sweeps or pay for a plan to hold three
 * lines of JSON, the schedule moves outside — an external caller hits THIS endpoint every two
 * minutes and every sweep runs from the one request. The Vercel cron entry stays as a daily
 * safety net, so the sweeps still run if the external caller is deleted or forgotten.
 *
 * The three original routes are still there and still work. They are how you run one sweep on
 * its own during an incident without also flushing the outbox.
 *
 * ORDER MATTERS. Reservations first: releasing stock writes a notification for every
 * administrator, and running the push sweep afterwards delivers it in the same tick instead of
 * two minutes later. Mail sits between them because it is the slowest and the least urgent —
 * a queued message that waits one more tick is a message, a stock reservation that waits is
 * inventory nobody can sell.
 *
 * One failing sweep does not stop the others: they share a database and nothing else, and
 * "the push service is having a bad minute" is not a reason to stop releasing stock.
 *
 * Node runtime: web-push signs with Node's crypto.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * The reservation sweep keeps its hourly cadence even though the caller arrives every two
 * minutes. It is not free — it re-reads every unshipped order past the window and asks the
 * audit log whether each was already swept — and nothing it does gets more correct by being
 * done 30 times an hour. The window it enforces is measured in hours.
 */
const RESERVATION_SWEEP_INTERVAL_MS = 60 * 60 * 1000
const LAST_RUN_SETTING = "cron.reservation_sweep_last_run"

type Outcome =
    | ({ ok: true; skipped?: string } & Record<string, unknown>)
    | { ok: false; error: string }

async function attempt(label: string, work: () => Promise<Record<string, unknown>>): Promise<Outcome> {
    try {
        return { ok: true, ...(await work()) }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[cron:sweep] ${label} failed: ${message}`)
        return { ok: false, error: message }
    }
}

/**
 * Claims the hour BEFORE doing the work, not after.
 *
 * A sweep that throws halfway has already released some stock, and a marker written only on
 * success would send the next caller — two minutes later — through the same failing orders
 * again, every two minutes, forever. Losing one hourly run to a transient error is the cheaper
 * failure: the next hour picks up exactly the same candidates, because the sweep decides what
 * to do from the audit log rather than from the clock.
 *
 * Two callers arriving in the same millisecond could both claim it. That is fine and not worth
 * a lock: `sweepExpiredReservations` skips any order it has already logged.
 */
async function claimReservationSweep(now: Date): Promise<boolean> {
    const row = await prisma.systemSetting.findUnique({ where: { key: LAST_RUN_SETTING } })
    const last = row ? Date.parse(row.value) : Number.NaN
    if (Number.isFinite(last) && now.getTime() - last < RESERVATION_SWEEP_INTERVAL_MS) return false

    const value = now.toISOString()
    await prisma.systemSetting.upsert({
        where: { key: LAST_RUN_SETTING },
        create: { key: LAST_RUN_SETTING, value },
        update: { value },
    })
    return true
}

export async function GET(request: NextRequest) {
    // One secret for the combined endpoint, and it is the name Vercel Cron itself sends, so the
    // daily safety net authenticates without a second variable to keep in step.
    const denied = authorizeCron(request, "CRON_SECRET", "cron:sweep")
    if (denied) return denied

    const startedAt = Date.now()
    const now = new Date()

    const reservations = await attempt("reservations", async () => {
        if (!(await claimReservationSweep(now))) {
            return { skipped: "not due; runs hourly" }
        }
        const summary = await sweepExpiredReservations(prisma, now)
        const rateLimitsDeleted = await sweepRateLimits(prisma)
        if (summary.ordersReleased > 0) {
            console.warn(
                `[cron:sweep] released reservations on ${summary.ordersReleased} order(s) past ${summary.windowHours}h: ` +
                    summary.released.map((o) => o.orderNumber).join(", ")
            )
        }
        return { ...summary, rateLimitsDeleted }
    })

    const mail = await attempt("mail", async () => {
        const summary = await dispatchOutbox(prisma)
        if (summary.failed > 0) {
            console.error(`[cron:sweep] ${summary.failed} message(s) exhausted their retries and are now FAILED.`)
        }
        return { ...summary }
    })

    const push = await attempt("push", async () => {
        const summary = await dispatchPush(prisma)
        // Worth saying out loud, because the failure mode is silence: with no VAPID pair the
        // sweep runs cleanly, delivers nothing, and looks identical to "nothing to deliver".
        if (!isPushConfigured()) {
            console.warn("[cron:sweep] VAPID is not configured; notifications are written but never pushed.")
        }
        if (summary.pruned > 0) {
            console.warn(`[cron:sweep] pruned ${summary.pruned} dead subscription(s).`)
        }
        return { ...summary, configured: isPushConfigured() }
    })

    const body = { reservations, mail, push, durationMs: Date.now() - startedAt }

    // 500 when any sweep threw, so an external caller's own alerting sees it. Retrying is safe:
    // every sweep here picks its work from the database, so a repeat run finds only what is
    // still outstanding.
    const failed = [reservations, mail, push].some((outcome) => !outcome.ok)
    return NextResponse.json({ ok: !failed, ...body }, { status: failed ? 500 : 200 })
}
