/**
 * The six templates §16 requires, each in both languages.
 *
 * One file because they share a shell and differ by a dozen lines each; splitting them into
 * six would mean six copies of the same imports and no more clarity.
 */
// `import * as React` is deliberate even though tsconfig sets jsx: "react-jsx".
// This package is consumed by two different transpilers: Next's SWC, which uses the
// automatic runtime, and plain tsx/node in the cron sweep and in scripts, which emits
// React.createElement. Under the second, JSX with no React in scope throws
// "ReferenceError: React is not defined" AT RUNTIME — the type checker cannot see it,
// and it was found by rendering a template rather than by compiling one.
import * as React from "react"
import { Section, Text } from "@react-email/components"
import type { MailLocale } from "../types"
import { ActionButton, DetailRows, INK, MUTED, Muted, Paragraph, Shell } from "./layout"
import { strings, t } from "./strings"
import type {
    ContactAcknowledgementPayload,
    ContactAdminNotificationPayload,
    EmailVerificationPayload,
    OrderConfirmationPayload,
    OrderStatusChangePayload,
    PasswordResetPayload,
} from "./payloads"

function greet(locale: MailLocale, name?: string) {
    return name ? t(strings.greetingNamed, locale, { name }) : t(strings.greeting, locale)
}

export function EmailVerification({ locale, payload }: { locale: MailLocale; payload: EmailVerificationPayload }) {
    return (
        <Shell locale={locale} preview={t(strings.verifyBody, locale)}>
            <Paragraph>{greet(locale, payload.name)}</Paragraph>
            <Paragraph>{t(strings.verifyBody, locale)}</Paragraph>
            <ActionButton locale={locale} href={payload.verifyUrl} label={t(strings.verifyButton, locale)} />
            <Muted>{t(strings.verifyExpiry, locale, { minutes: payload.expiresInMinutes })}</Muted>
            <Muted>{t(strings.verifyIgnore, locale)}</Muted>
        </Shell>
    )
}

export function PasswordReset({ locale, payload }: { locale: MailLocale; payload: PasswordResetPayload }) {
    return (
        <Shell locale={locale} preview={t(strings.resetBody, locale)}>
            <Paragraph>{greet(locale, payload.name)}</Paragraph>
            <Paragraph>{t(strings.resetBody, locale)}</Paragraph>
            <ActionButton locale={locale} href={payload.resetUrl} label={t(strings.resetButton, locale)} />
            <Muted>{t(strings.verifyExpiry, locale, { minutes: payload.expiresInMinutes })}</Muted>
            <Muted>{t(strings.resetIgnore, locale)}</Muted>
        </Shell>
    )
}

export function OrderConfirmation({ locale, payload }: { locale: MailLocale; payload: OrderConfirmationPayload }) {
    const rtl = locale === "ar"
    const align = rtl ? ("right" as const) : ("left" as const)
    const money = (amount: string) => `${amount} ${payload.currency}`

    return (
        <Shell locale={locale} preview={t(strings.orderSubject, locale, { orderNumber: payload.orderNumber })}>
            <Paragraph>{greet(locale, payload.address.fullName)}</Paragraph>
            <Paragraph>{t(strings.orderBody, locale)}</Paragraph>

            <DetailRows locale={locale} rows={[[t(strings.orderNumber, locale), payload.orderNumber]]} />

            <Text style={{ color: INK, fontSize: 14, fontWeight: 700, margin: "24px 0 8px" }}>
                {t(strings.orderItems, locale)}
            </Text>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                    {payload.items.map((item, index) => (
                        <tr key={`${item.name}-${index}`}>
                            <td style={{ color: INK, fontSize: 14, padding: "6px 0", textAlign: align }}>
                                {item.name}
                                <span style={{ color: MUTED }}>{`  ×${item.quantity}`}</span>
                            </td>
                            <td style={{ color: INK, fontSize: 14, padding: "6px 0", textAlign: rtl ? "left" : "right", whiteSpace: "nowrap" }}>
                                {money(item.price)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <DetailRows
                locale={locale}
                rows={[
                    [t(strings.orderSubtotal, locale), money(payload.subtotal)],
                    [t(strings.orderShipping, locale), money(payload.shippingCost)],
                    [t(strings.orderTotal, locale), money(payload.total)],
                ]}
            />
            <Muted>{t(strings.orderPaymentCod, locale)}</Muted>

            <Text style={{ color: INK, fontSize: 14, fontWeight: 700, margin: "24px 0 8px" }}>
                {t(strings.orderDeliverTo, locale)}
            </Text>
            <Section>
                <Text style={{ color: INK, fontSize: 14, lineHeight: "22px", margin: 0 }}>
                    {payload.address.fullName}
                    <br />
                    {payload.address.addressLine1}
                    {payload.address.addressLine2 ? (
                        <>
                            <br />
                            {payload.address.addressLine2}
                        </>
                    ) : null}
                    <br />
                    {payload.address.city}, {payload.address.country}
                    <br />
                    {payload.address.phone}
                </Text>
            </Section>

            <ActionButton locale={locale} href={payload.orderUrl} label={t(strings.orderButton, locale)} />
        </Shell>
    )
}

const STATUS_COPY = {
    awaiting_shipment: strings.statusAwaitingShipment,
    shipped: strings.statusShipped,
    delivered: strings.statusDelivered,
    cancelled: strings.statusCancelled,
} as const

export function OrderStatusChange({ locale, payload }: { locale: MailLocale; payload: OrderStatusChangePayload }) {
    const status = t(STATUS_COPY[payload.status], locale)
    return (
        <Shell locale={locale} preview={t(strings.statusSubject, locale, { orderNumber: payload.orderNumber, status })}>
            <Paragraph>{t(strings.statusSubject, locale, { orderNumber: payload.orderNumber, status })}</Paragraph>
            <DetailRows
                locale={locale}
                rows={[
                    [t(strings.orderNumber, locale), payload.orderNumber],
                    ...(payload.trackingNumber ? ([[t(strings.statusTracking, locale), payload.trackingNumber]] as Array<[string, string]>) : []),
                ]}
            />
            <ActionButton locale={locale} href={payload.orderUrl} label={t(strings.orderButton, locale)} />
        </Shell>
    )
}

export function ContactAcknowledgement({ locale, payload }: { locale: MailLocale; payload: ContactAcknowledgementPayload }) {
    return (
        <Shell locale={locale} preview={t(strings.contactAckBody, locale)}>
            <Paragraph>{greet(locale, payload.fullName)}</Paragraph>
            <Paragraph>{t(strings.contactAckBody, locale)}</Paragraph>
        </Shell>
    )
}

export function ContactAdminNotification({ locale, payload }: { locale: MailLocale; payload: ContactAdminNotificationPayload }) {
    return (
        <Shell locale={locale} preview={t(strings.contactAdminBody, locale)}>
            <Paragraph>{t(strings.contactAdminBody, locale)}</Paragraph>
            <DetailRows
                locale={locale}
                rows={[
                    [t(strings.contactName, locale), payload.fullName],
                    [t(strings.contactEmail, locale), payload.email],
                    [t(strings.contactPhone, locale), payload.phoneNumber],
                    [t(strings.contactPosition, locale), payload.jobPosition],
                    ...(payload.message ? ([[t(strings.contactMessage, locale), payload.message]] as Array<[string, string]>) : []),
                ]}
            />
            <ActionButton locale={locale} href={payload.adminUrl} label={t(strings.contactButton, locale)} />
        </Shell>
    )
}
