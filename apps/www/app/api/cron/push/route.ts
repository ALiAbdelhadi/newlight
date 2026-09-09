import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@repo/database"
import { dispatchPush, isPushConfigured } from "@repo/notifications"

import { authorizeCron } from "@/lib/cron-auth"

/**
 * The push sweep — BUILD §17.
 *
 * The safety net under `dispatchPushSoon()`. Every notification is written inside the
 * transaction that causes it and pushed immediately after the commit; this exists for the
 * cases where "immediately after" never happened — a serverless instance torn down mid-flight,
 * a push service returning 503 for a minute, a notification written by a script rather than by
 * a request. Anything left unpushed is picked up here.
 *
 * Lives in apps/www beside the mail sweep for one boring reason: Vercel crons are configured
 * per project and this repository's crons are declared in apps/www/vercel.json. The recipients
 * are administrators, but nothing about signing a Web Push payload requires being the admin
 * app — it is an HTTPS request to the browser vendor's push service.
 *
 * Node runtime: web-push signs with Node's crypto.
 *
 * Authorised by a shared secret, not by obscurity. An open URL that sends notifications is an
 * open URL that sends notifications for someone else.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
    const denied = authorizeCron(request, "PUSH_SWEEP_CRON_SECRET", "cron:push")
    if (denied) return denied

    const summary = await dispatchPush(prisma)

    // Worth saying out loud, because the failure mode is silence: with no VAPID pair the sweep
    // runs cleanly, delivers nothing, and looks identical to "there was nothing to deliver".
    if (!isPushConfigured()) {
        console.warn("[cron:push] VAPID is not configured; notifications are written but never pushed.")
    }
    if (summary.pruned > 0) {
        console.warn(`[cron:push] pruned ${summary.pruned} dead subscription(s).`)
    }

    return NextResponse.json({ ...summary, configured: isPushConfigured() })
}
