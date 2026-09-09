import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@repo/database"
import { isPushConfigured, publicVapidKey, removeSubscription, saveSubscription } from "@repo/notifications"

import { requireCurrentAdmin } from "@/lib/auth"

/**
 * Where a browser registers and deregisters itself for admin push (§17).
 *
 * Node runtime, not edge: the sweep that uses these rows signs payloads with Node's crypto,
 * and keeping the two on the same runtime is what stops a subscription being writable from a
 * context that could never deliver to it.
 *
 * Every method starts with `requireCurrentAdmin()`. A push subscription is a delivery channel
 * for operational data — order values, customer names — so an unauthenticated POST here would
 * be an open subscription to the business.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The shape `PushSubscription.toJSON()` produces. Validated rather than trusted: the endpoint
 * is a URL this server will later make a request to, and an unvalidated one is a request the
 * server makes on someone else's behalf.
 */
const subscriptionSchema = z.object({
    endpoint: z.url().max(2048),
    keys: z.object({
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
    }),
})

/** Whether push can work at all, so the UI can say "not configured" instead of failing silently. */
export async function GET() {
    try {
        await requireCurrentAdmin()
    } catch {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ configured: isPushConfigured(), publicKey: publicVapidKey() })
}

export async function POST(request: NextRequest) {
    let adminId: string
    try {
        adminId = (await requireCurrentAdmin()).id
    } catch {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid subscription" }, { status: 400 })
    }

    // Only the two push services a browser can actually hand back. A subscription pointing
    // anywhere else did not come from `pushManager.subscribe()`, and honouring it would turn
    // this endpoint into something that makes authenticated requests to a URL of the
    // caller's choosing.
    if (!isKnownPushService(parsed.data.endpoint)) {
        // Logged with the HOST and nothing else. The rest of an endpoint is a device
        // identifier, and this is the one refusal an administrator cannot diagnose from the
        // browser: a vendor that starts issuing endpoints on a new hostname would look, from
        // their side, like a switch that simply does not work.
        console.warn(`[push] refused a subscription from an unrecognised host: ${hostOf(parsed.data.endpoint)}`)
        return NextResponse.json({ error: "unrecognised push service" }, { status: 400 })
    }

    const { id } = await saveSubscription(prisma, {
        userId: adminId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ ok: true, id })
}

export async function DELETE(request: NextRequest) {
    let adminId: string
    try {
        adminId = (await requireCurrentAdmin()).id
    } catch {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const endpoint = typeof body === "object" && body !== null ? (body as { endpoint?: unknown }).endpoint : null
    if (typeof endpoint !== "string" || endpoint.length === 0) {
        return NextResponse.json({ error: "endpoint required" }, { status: 400 })
    }

    // Scoped to the caller, so posting someone else's endpoint cannot unsubscribe them.
    const { removed } = await removeSubscription(prisma, adminId, endpoint)
    return NextResponse.json({ ok: true, removed })
}

const PUSH_SERVICE_HOSTS = [
    // Chrome, Edge, and every other Chromium browser.
    "fcm.googleapis.com",
    "android.googleapis.com",
    // Firefox.
    "updates.push.services.mozilla.com",
    "autopush.stage.mozaws.net",
    // Safari, iOS and macOS.
    "web.push.apple.com",
    // Edge's legacy endpoint, still issued by some installs.
    "wns2-*.notify.windows.com",
]

function hostOf(endpoint: string): string {
    try {
        return new URL(endpoint).hostname
    } catch {
        return "<unparseable>"
    }
}

function isKnownPushService(endpoint: string): boolean {
    let host: string
    try {
        const url = new URL(endpoint)
        if (url.protocol !== "https:") return false
        host = url.hostname
    } catch {
        return false
    }

    return PUSH_SERVICE_HOSTS.some((pattern) =>
        pattern.includes("*")
            ? new RegExp(`^${pattern.split("*").map(escapeRegExp).join("[a-z0-9-]+")}$`).test(host)
            : host === pattern
    )
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
