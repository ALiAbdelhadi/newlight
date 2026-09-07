/**
 * Render one template into a subject, an HTML body and a plain-text body.
 *
 * The subject lives here, not at the call site: a subject is copy, it needs translating, and
 * having it next to the body is what stops an Arabic email arriving with an English subject.
 *
 * Every email gets a real text part. A mail with only an HTML body scores as spam with
 * several filters, and screen readers handle text better than a table-based layout.
 */
// `import * as React` is deliberate even though tsconfig sets jsx: "react-jsx".
// This package is consumed by two different transpilers: Next's SWC, which uses the
// automatic runtime, and plain tsx/node in the cron sweep and in scripts, which emits
// React.createElement. Under the second, JSX with no React in scope throws
// "ReferenceError: React is not defined" AT RUNTIME — the type checker cannot see it,
// and it was found by rendering a template rather than by compiling one.
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
    // The switch is exhaustive over MailTemplate, so adding a template without rendering it
    // is a compile error rather than a runtime one.
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
