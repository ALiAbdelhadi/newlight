/**
 * What each template needs, as data.
 *
 * These are the shapes stored in EmailOutbox.payload, so they must stay JSON-serialisable and
 * they must stay STABLE: a row queued before a deploy is rendered by the code after it. Money
 * is a string throughout (ADR 0001) — a JSON number cannot hold a Decimal without rounding it,
 * and these appear on an order confirmation.
 */
import type { MailTemplate } from "../types"

export interface EmailVerificationPayload {
    name?: string
    verifyUrl: string
    expiresInMinutes: number
}

export interface PasswordResetPayload {
    name?: string
    resetUrl: string
    expiresInMinutes: number
}

export interface OrderLine {
    name: string
    quantity: number
    /** Serialised money, e.g. "1183.00". */
    price: string
}

export interface OrderConfirmationPayload {
    orderNumber: string
    items: OrderLine[]
    subtotal: string
    shippingCost: string
    total: string
    currency: string
    address: {
        fullName: string
        phone: string
        addressLine1: string
        addressLine2?: string
        city: string
        country: string
    }
    orderUrl: string
}

export interface OrderStatusChangePayload {
    orderNumber: string
    status: "awaiting_shipment" | "shipped" | "delivered" | "cancelled"
    orderUrl: string
    trackingNumber?: string
}

export interface ContactAcknowledgementPayload {
    fullName: string
}

export interface ContactAdminNotificationPayload {
    fullName: string
    email: string
    phoneNumber: string
    jobPosition: string
    message?: string
    adminUrl: string
}

/** The map that makes `render(template, locale, payload)` type-safe at every call site. */
export interface PayloadByTemplate {
    "email-verification": EmailVerificationPayload
    "password-reset": PasswordResetPayload
    "order-confirmation": OrderConfirmationPayload
    "order-status-change": OrderStatusChangePayload
    "contact-acknowledgement": ContactAcknowledgementPayload
    "contact-admin-notification": ContactAdminNotificationPayload
}

export type PayloadFor<T extends MailTemplate> = PayloadByTemplate[T]
