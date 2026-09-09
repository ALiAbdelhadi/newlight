/**
 * The notification interface.
 *
 * A notification has two halves that are deliberately separate: the ROW, which is durable and
 * is what the admin bell reads, and the PUSH, which is a best-effort delivery of that row to a
 * browser. The row is the truth. Push is how someone finds out about it without looking.
 *
 * Anything that describes only the push — the icon, the tag, the click target — is derived
 * from the row rather than stored beside it, so the two can never disagree.
 */
import type { NotificationPriority, NotificationType } from "@repo/database"

export type { NotificationPriority, NotificationType }

export interface NotificationInput {
    type: NotificationType
    title: string
    message: string
    /**
     * Where clicking the notification lands, as a path relative to the ADMIN app
     * (`/admin/orders/abc`). A path rather than a URL because the origin differs between
     * local, preview and production, and a stored absolute URL is how a notification written
     * in staging opens staging from production.
     */
    actionUrl?: string
    priority?: NotificationPriority
    /** Anything the surface reading the notification wants; never rendered blindly. */
    metadata?: Record<string, unknown>
    expiresAt?: Date
}

/** What actually goes over the wire to a service worker. Keep it small: 4KB is the limit. */
export interface PushPayload {
    notificationId: string
    type: NotificationType
    title: string
    body: string
    url: string | null
    priority: NotificationPriority
    /** Epoch milliseconds. The service worker uses it for `timestamp`, not for ordering. */
    at: number
}

export type PushOutcome =
    /** Accepted by the push service. Says nothing about the browser having shown it. */
    | { ok: true }
    /**
     * The endpoint is permanently gone — 404 or 410. The only correct response is to delete
     * the subscription; retrying is guaranteed to fail forever.
     */
    | { ok: false; gone: true; error: string }
    /** Anything else: a 5xx, a timeout, a misconfigured VAPID pair. Worth another attempt. */
    | { ok: false; gone: false; error: string }

export class PushNotConfiguredError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "PushNotConfiguredError"
    }
}
