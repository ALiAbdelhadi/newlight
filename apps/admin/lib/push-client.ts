"use client"

/**
 * The browser half of admin push (§17).
 *
 * Everything here is feature-detected rather than assumed. Push is unavailable in more real
 * situations than it is available in: Safari before 16.4, any browser in a private window,
 * an iOS install that has not been added to the Home Screen, a page that is not on HTTPS. The
 * bell must degrade to polling in every one of those rather than throw, so each function
 * returns a reason instead of an exception.
 */

export type PushSupport =
    | { supported: true }
    | { supported: false; reason: string }

export function pushSupport(): PushSupport {
    if (typeof window === "undefined") return { supported: false, reason: "not in a browser" }
    if (!("serviceWorker" in navigator)) return { supported: false, reason: "this browser has no service workers" }
    if (!("PushManager" in window)) return { supported: false, reason: "this browser does not support push" }
    if (!("Notification" in window)) return { supported: false, reason: "this browser does not support notifications" }
    // iOS grants push only to an installed web app, and `subscribe()` there fails with an
    // error message nobody can act on. Saying so up front is the difference between a
    // one-line instruction and a support ticket.
    if (isIosSafari() && !isStandalone()) {
        return { supported: false, reason: "on iPhone and iPad, add this panel to the Home Screen first" }
    }
    return { supported: true }
}

export type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on"

export interface PushStatus {
    state: PushState
    /** Present when the state is one the person cannot fix themselves. */
    reason?: string
}

/** What the server thinks: whether a VAPID pair exists, and the public half of it. */
interface PushConfig {
    configured: boolean
    publicKey: string | null
}

async function fetchConfig(): Promise<PushConfig> {
    const response = await fetch("/api/push/subscribe", { cache: "no-store" })
    if (!response.ok) return { configured: false, publicKey: null }
    return (await response.json()) as PushConfig
}

export async function currentPushStatus(): Promise<PushStatus> {
    const support = pushSupport()
    if (!support.supported) return { state: "unsupported", reason: support.reason }

    const config = await fetchConfig()
    if (!config.configured || !config.publicKey) {
        return { state: "unconfigured", reason: "VAPID keys are not set on the server" }
    }

    if (Notification.permission === "denied") {
        return { state: "denied", reason: "notifications are blocked for this site in the browser's settings" }
    }

    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    return { state: subscription ? "on" : "off" }
}

/**
 * Register the worker, ask for permission, subscribe, and tell the server.
 *
 * Called from a click handler and nowhere else. A permission prompt fired on page load is
 * dismissed reflexively, and a dismissed prompt in Chrome is a permanent block after three
 * of them — so the one place this may be called from is a button someone pressed.
 */
export async function enablePush(): Promise<PushStatus> {
    const support = pushSupport()
    if (!support.supported) return { state: "unsupported", reason: support.reason }

    const config = await fetchConfig()
    if (!config.configured || !config.publicKey) {
        return { state: "unconfigured", reason: "VAPID keys are not set on the server" }
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
        return {
            state: permission === "denied" ? "denied" : "off",
            reason: permission === "denied" ? "notifications are blocked for this site" : undefined,
        }
    }

    const registration = await navigator.serviceWorker.register("/sw.js")
    // `register()` resolves before the worker controls the page; subscribing against a
    // registration that is still installing throws on Firefox.
    await navigator.serviceWorker.ready

    const existing = await registration.pushManager.getSubscription()
    const subscription =
        existing ??
        (await registration.pushManager.subscribe({
            // Required to be true by every browser: a push that shows nothing is a silent
            // wake-up of someone's device, and none of them will issue a subscription for it.
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }))

    const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
    })

    if (!response.ok) {
        // The browser now holds a subscription the server does not know about, which would
        // read as "on" while delivering nothing. Undo it rather than lie.
        await subscription.unsubscribe().catch(() => undefined)
        return { state: "off", reason: "the server rejected the subscription" }
    }

    return { state: "on" }
}

export async function disablePush(): Promise<PushStatus> {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return { state: "off" }

    // Tell the server FIRST. If the order were reversed and the fetch failed, the row would
    // outlive the endpoint and the sweep would push into the void until it 410s.
    await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined)

    await subscription.unsubscribe().catch(() => undefined)
    return { state: "off" }
}

/**
 * The VAPID public key travels as URL-safe base64 and `applicationServerKey` wants bytes.
 * Standard conversion; the padding matters, and getting it wrong fails at subscribe time with
 * "InvalidCharacterError", which says nothing about keys.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
    const raw = window.atob(normalised)

    // Backed by an explicit ArrayBuffer, not by `new Uint8Array(length)`. Since TypeScript 5.7
    // the latter is `Uint8Array<ArrayBufferLike>`, which `applicationServerKey` — a
    // `BufferSource` — will not accept, because ArrayBufferLike admits SharedArrayBuffer.
    const buffer = new ArrayBuffer(raw.length)
    const output = new Uint8Array(buffer)
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
    return output
}

function isIosSafari(): boolean {
    const ua = navigator.userAgent
    // iPadOS reports as a Mac; the touch-point count is what separates it from a desktop.
    const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
    return iOS
}

function isStandalone(): boolean {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    )
}
