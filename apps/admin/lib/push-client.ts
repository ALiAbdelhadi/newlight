"use client"

export type PushSupport =
    | { supported: true }
    | { supported: false; reason: string }

export function pushSupport(): PushSupport {
    if (typeof window === "undefined") return { supported: false, reason: "not in a browser" }
    if (!("serviceWorker" in navigator)) return { supported: false, reason: "this browser has no service workers" }
    if (!("PushManager" in window)) return { supported: false, reason: "this browser does not support push" }
    if (!("Notification" in window)) return { supported: false, reason: "this browser does not support notifications" }
    if (isIosSafari() && !isStandalone()) {
        return { supported: false, reason: "on iPhone and iPad, add this panel to the Home Screen first" }
    }
    return { supported: true }
}

export type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on"

export interface PushStatus {
    state: PushState
    reason?: string
}

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
    await navigator.serviceWorker.ready

    const existing = await registration.pushManager.getSubscription()
    const subscription =
        existing ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }))

    const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
    })

    if (!response.ok) {
        await subscription.unsubscribe().catch(() => undefined)
        return { state: "off", reason: "the server rejected the subscription" }
    }

    return { state: "on" }
}

export async function disablePush(): Promise<PushStatus> {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return { state: "off" }

    await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined)

    await subscription.unsubscribe().catch(() => undefined)
    return { state: "off" }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
    const raw = window.atob(normalised)

    const buffer = new ArrayBuffer(raw.length)
    const output = new Uint8Array(buffer)
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
    return output
}

function isIosSafari(): boolean {
    const ua = navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
    return iOS
}

function isStandalone(): boolean {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    )
}
