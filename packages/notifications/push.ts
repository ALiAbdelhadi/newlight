/**
 * The Web Push transport.
 *
 * Everything that knows the `web-push` library exists is in this file, for the same reason
 * @repo/mail hides Nodemailer and Resend behind one seam: the delivery mechanism is a runtime
 * detail, and a call site should say only *what* to deliver and *to whom*.
 *
 * `sendPush` NEVER THROWS. A notification that fails to reach a browser must not fail the
 * order that produced it, and the honest way to guarantee that is for the failure to be a
 * return value rather than an exception a caller might forget to catch. The three outcomes are
 * distinguished on purpose — accepted, permanently gone, temporarily failed — because they
 * lead to three different actions, and collapsing them is how a table fills with endpoints
 * that have been dead for a year.
 */
import type { PushOutcome, PushPayload } from "./types"

/** The three variables. All three or none — a half-configured VAPID pair delivers nothing. */
export interface VapidConfig {
    publicKey: string
    privateKey: string
    /** `mailto:` or an https URL. The push services use it to contact you about abuse. */
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

/**
 * The public key the browser needs to call `pushManager.subscribe()`.
 *
 * Read from the NEXT_PUBLIC_ variable in the browser, and from either here. Exposed as a
 * function so a client that asks before the environment is set gets `null` rather than a
 * subscription bound to `undefined`.
 */
export function publicVapidKey(): string | null {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null
}

/** The shape `PushSubscription.toJSON()` produces in the browser. */
export interface WebPushTarget {
    endpoint: string
    keys: { p256dh: string; auth: string }
}

/**
 * `web-push` is CommonJS and reaches for Node's crypto, so it is imported lazily rather than
 * at module scope. Two reasons, and the second is the one that bites: a static import makes
 * every consumer — including a route that only reads notifications — pay for it at cold
 * start, and it makes bundlers try to follow it into contexts where `crypto` does not exist.
 */
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

/** Test seam, and the reset the config needs if the environment changes inside one process. */
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
                // Long enough to survive a phone that is asleep for a working day, short
                // enough that nobody is told about an order from last week.
                TTL: 12 * 60 * 60,
                urgency: payload.priority === "URGENT" || payload.priority === "HIGH" ? "high" : "normal",
            }
        )
        return { ok: true }
    } catch (error) {
        const status = statusOf(error)
        const message = error instanceof Error ? error.message : String(error)

        // 404 and 410 are the only two that mean "this endpoint will never work again". A 403
        // is a WRONG VAPID KEY, which is a deployment mistake — deleting subscriptions over it
        // would silently unsubscribe every admin the first time a key is rotated badly.
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
