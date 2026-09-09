import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@repo/database"
import { dispatchPush, isPushConfigured } from "@repo/notifications"

import { authorizeCron } from "@/lib/cron-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
    const denied = authorizeCron(request, "PUSH_SWEEP_CRON_SECRET", "cron:push")
    if (denied) return denied

    const summary = await dispatchPush(prisma)

    if (!isPushConfigured()) {
        console.warn("[cron:push] VAPID is not configured; notifications are written but never pushed.")
    }
    if (summary.pruned > 0) {
        console.warn(`[cron:push] pruned ${summary.pruned} dead subscription(s).`)
    }

    return NextResponse.json({ ...summary, configured: isPushConfigured() })
}
