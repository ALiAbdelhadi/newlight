import { NextResponse, type NextRequest } from "next/server"
import { prisma, sweepExpiredReservations, sweepRateLimits } from "@repo/database"

import { authorizeCron } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
    const denied = authorizeCron(request, "INVENTORY_SWEEP_CRON_SECRET", "cron:sweep")
    if (denied) return denied

    const summary = await sweepExpiredReservations(prisma)

    const rateLimitsDeleted = await sweepRateLimits(prisma)
    if (summary.ordersReleased > 0) {
        console.warn(
            `[cron:sweep] released reservations on ${summary.ordersReleased} order(s) past ${summary.windowHours}h: ` +
                summary.released.map((o) => o.orderNumber).join(", ")
        )
    }
    return NextResponse.json({ ...summary, rateLimitsDeleted })
}
