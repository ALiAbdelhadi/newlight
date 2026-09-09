import type { PushOutcome, PushPayload } from "./types"

export interface VapidConfig {
    publicKey: string
    privateKey: string
    subject: string
}

export function vapidConfigFromEnv(): VapidConfig | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT

    if (!publicKey || !privateKey || !subject) return null
    return { publicKey, privateKey, subject }
}

export function isPushConfigured(): boolean {
    return vapidConfigFromEnv() !== null
}

export function publicVapidKey(): string | null {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null
}

export interface WebPushTarget {
    endpoint: string
    keys: { p256dh: string; auth: string }
}

type WebPushModule = typeof import("web-push")
let webpushPromise: Promise<WebPushModule> | null = null

async function webpush(config: VapidConfig): Promise<WebPushModule> {
    if (!webpushPromise) {
        webpushPromise = import("web-push").then((mod) => {
            const lib = (mod.default ?? mod) as WebPushModule
            lib.setVapidDetails(config.subject, config.publicKey, config.privateKey)
            return lib
        })
    }
    return webpushPromise
}

export function __resetPushTransportForTesting(): void {
    webpushPromise = null
}

export async function sendPush(target: WebPushTarget, payload: PushPayload): Promise<PushOutcome> {
    const config = vapidConfigFromEnv()
    if (!config) {
        return { ok: false, gone: false, error: "VAPID is not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)" }
    }

    try {
        const lib = await webpush(config)
        await lib.sendNotification(
            { endpoint: target.endpoint, keys: target.keys },
            JSON.stringify(payload),
            {
                TTL: 12 * 60 * 60,
                urgency: payload.priority === "URGENT" || payload.priority === "HIGH" ? "high" : "normal",
            }
        )
        return { ok: true }
    } catch (error) {
        const status = statusOf(error)
        const message = error instanceof Error ? error.message : String(error)

        return { ok: false, gone: status === 404 || status === 410, error: message }
    }
}

function statusOf(error: unknown): number | null {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
        const status = (error as { statusCode: unknown }).statusCode
        if (typeof status === "number") return status
    }
    return null
}
