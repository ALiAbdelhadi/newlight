import { NextResponse, type NextRequest } from "next/server"
import { prisma, sweepExpiredReservations, sweepRateLimits } from "@repo/database"

/**
 * The reservation sweep — BUILD §8.3.
 *
 * Runs hourly. Releases stock held by orders that have sat unshipped past the window, raises
 * a notification for every administrator, and **never cancels the order** — see the note on
 * `sweepExpiredReservations` for why that restraint is the point rather than an omission.
 *
 * The window is a `SystemSetting` (`inventory.reservation_ttl_hours`), so changing it is a
 * row, not a deploy.
 */
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
    const secret = process.env.INVENTORY_SWEEP_CRON_SECRET
    if (!secret) {
        console.error("[cron:sweep] INVENTORY_SWEEP_CRON_SECRET is not set; refusing to run unauthenticated.")
        return NextResponse.json({ error: "not configured" }, { status: 503 })
    }

    const header = request.headers.get("authorization")
    const provided = header?.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("secret")
    if (provided !== secret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const summary = await sweepExpiredReservations(prisma)

    // Rides along rather than getting its own schedule: a rate-limit row that is a day old
    // decides nothing, and cleaning it up on the request path would make the endpoint it
    // protects slower.
    const rateLimitsDeleted = await sweepRateLimits(prisma)
    if (summary.ordersReleased > 0) {
        console.warn(
            `[cron:sweep] released reservations on ${summary.ordersReleased} order(s) past ${summary.windowHours}h: ` +
                summary.released.map((o) => o.orderNumber).join(", ")
        )
    }
    return NextResponse.json({ ...summary, rateLimitsDeleted })
}
