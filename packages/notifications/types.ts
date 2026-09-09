import type { NotificationPriority, NotificationType } from "@repo/database"

export type { NotificationPriority, NotificationType }

export interface NotificationInput {
    type: NotificationType
    title: string
    message: string
    actionUrl?: string
    priority?: NotificationPriority
    metadata?: Record<string, unknown>
    expiresAt?: Date
}

export interface PushPayload {
    notificationId: string
    type: NotificationType
    title: string
    body: string
    url: string | null
    priority: NotificationPriority
    at: number
}

export type PushOutcome =
    | { ok: true }
    | { ok: false; gone: true; error: string }
    | { ok: false; gone: false; error: string }

export class PushNotConfiguredError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "PushNotConfiguredError"
    }
}
