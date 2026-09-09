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
    price: string

    lineTotal?: string
    imageUrl?: string
    sku?: string
    productUrl?: string
    attributes?: Array<{ label: string; value: string }>
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

export interface PayloadByTemplate {
    "email-verification": EmailVerificationPayload
    "password-reset": PasswordResetPayload
    "order-confirmation": OrderConfirmationPayload
    "order-status-change": OrderStatusChangePayload
    "contact-acknowledgement": ContactAcknowledgementPayload
    "contact-admin-notification": ContactAdminNotificationPayload
}

export type PayloadFor<T extends MailTemplate> = PayloadByTemplate[T]
