import * as React from "react"
import { render } from "@react-email/render"
import type { MailLocale, MailTemplate } from "../types"
import type { PayloadByTemplate } from "./payloads"
import {
    ContactAcknowledgement,
    ContactAdminNotification,
    EmailVerification,
    OrderConfirmation,
    OrderStatusChange,
    PasswordReset,
} from "./emails"
import { strings, t } from "./strings"

export interface RenderedMail {
    subject: string
    html: string
    text: string
}

const STATUS_COPY = {
    awaiting_shipment: strings.statusAwaitingShipment,
    shipped: strings.statusShipped,
    delivered: strings.statusDelivered,
    cancelled: strings.statusCancelled,
} as const

export async function renderTemplate<T extends MailTemplate>(
    template: T,
    locale: MailLocale,
    payload: PayloadByTemplate[T]
): Promise<RenderedMail> {
    switch (template) {
        case "email-verification": {
            const p = payload as PayloadByTemplate["email-verification"]
            return finish(t(strings.verifySubject, locale), <EmailVerification locale={locale} payload={p} />)
        }
        case "password-reset": {
            const p = payload as PayloadByTemplate["password-reset"]
            return finish(t(strings.resetSubject, locale), <PasswordReset locale={locale} payload={p} />)
        }
        case "order-confirmation": {
            const p = payload as PayloadByTemplate["order-confirmation"]
            return finish(
                t(strings.orderSubject, locale, { orderNumber: p.orderNumber }),
                <OrderConfirmation locale={locale} payload={p} />
            )
        }
        case "order-status-change": {
            const p = payload as PayloadByTemplate["order-status-change"]
            return finish(
                t(strings.statusSubject, locale, { orderNumber: p.orderNumber, status: t(STATUS_COPY[p.status], locale) }),
                <OrderStatusChange locale={locale} payload={p} />
            )
        }
        case "contact-acknowledgement": {
            const p = payload as PayloadByTemplate["contact-acknowledgement"]
            return finish(t(strings.contactAckSubject, locale), <ContactAcknowledgement locale={locale} payload={p} />)
        }
        case "contact-admin-notification": {
            const p = payload as PayloadByTemplate["contact-admin-notification"]
            return finish(
                t(strings.contactAdminSubject, locale, { name: p.fullName }),
                <ContactAdminNotification locale={locale} payload={p} />
            )
        }
        default: {
            const exhaustive: never = template
            throw new Error(`no renderer for template ${String(exhaustive)}`)
        }
    }
}

async function finish(subject: string, element: React.ReactElement): Promise<RenderedMail> {
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
    return { subject, html, text }
}
