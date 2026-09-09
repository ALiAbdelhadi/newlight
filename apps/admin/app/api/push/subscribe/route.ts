import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@repo/database"
import { isPushConfigured, publicVapidKey, removeSubscription, saveSubscription } from "@repo/notifications"

import { requireCurrentAdmin } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const subscriptionSchema = z.object({
    endpoint: z.url().max(2048),
    keys: z.object({
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
    }),
})

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

    if (!isKnownPushService(parsed.data.endpoint)) {
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

    const { removed } = await removeSubscription(prisma, adminId, endpoint)
    return NextResponse.json({ ok: true, removed })
}

const PUSH_SERVICE_HOSTS = [
    "fcm.googleapis.com",
    "android.googleapis.com",
    "updates.push.services.mozilla.com",
    "autopush.stage.mozaws.net",
    "web.push.apple.com",
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
