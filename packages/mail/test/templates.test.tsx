import { describe, expect, it } from "vitest"
import { renderTemplate } from "../templates/index"
import type { MailLocale, MailTemplate } from "../types"
import type { PayloadByTemplate } from "../templates/payloads"

/**
 * §25: "Mail: templates render in both locales."
 *
 * These exist because the type checker could not see the bug that actually shipped: JSX with
 * no React in scope threw `ReferenceError: React is not defined` at RUNTIME under one of the
 * two transpilers this package is built by (A35). `tsc --noEmit` was clean throughout. A test
 * that renders is the only kind that would have caught it.
 */

/**
 * Typed per template rather than `as const`: `as const` makes the arrays readonly, which the
 * mutable payload types reject — and widening the payload types to accept readonly arrays to
 * please a test would be the test dictating the production shape.
 */
const PAYLOADS: { [K in MailTemplate]: PayloadByTemplate[K] } = {
    "email-verification": { name: "Ali", verifyUrl: "https://x.invalid/v?t=1", expiresInMinutes: 60 },
    "password-reset": { name: "Ali", resetUrl: "https://x.invalid/r?t=1", expiresInMinutes: 60 },
    "order-confirmation": {
        orderNumber: "NL-1",
        items: [{ name: "nl-a603-6w", quantity: 2, price: "150.00" }],
        subtotal: "300.00",
        shippingCost: "100.00",
        total: "400.00",
        currency: "EGP",
        address: { fullName: "علي", phone: "+20", addressLine1: "شارع", city: "القاهرة", country: "مصر" },
        orderUrl: "https://x.invalid/o/1",
    },
    "order-status-change": { orderNumber: "NL-1", status: "shipped" as const, orderUrl: "https://x.invalid/o/1", trackingNumber: "T-1" },
    "contact-acknowledgement": { fullName: "علي" },
    "contact-admin-notification": {
        fullName: "Ali", email: "a@x.invalid", phoneNumber: "+20", jobPosition: "Buyer",
        message: "Do you supply IP65?", adminUrl: "https://admin.invalid/1",
    },
} as const

const TEMPLATES = Object.keys(PAYLOADS) as MailTemplate[]
const LOCALES: MailLocale[] = ["en", "ar"]

describe("every template, in both languages", () => {
    for (const template of TEMPLATES) {
        for (const locale of LOCALES) {
            it(`renders ${template} in ${locale}`, async () => {
                const mail = await renderTemplate(template, locale, PAYLOADS[template])

                expect(mail.subject.length).toBeGreaterThan(0)
                expect(mail.html).toContain("<table")
                // A mail with no text part scores as spam with several filters, and screen
                // readers handle text better than a table-based layout.
                expect(mail.text.trim().length).toBeGreaterThan(20)
            })
        }
    }
})

describe("Arabic is Arabic, not English with an Arabic string in it", () => {
    it("sets dir=rtl and an Arabic-safe face", async () => {
        const mail = await renderTemplate("order-confirmation", "ar", PAYLOADS["order-confirmation"])
        expect(mail.html).toContain('dir="rtl"')
        expect(mail.html).toContain('lang="ar"')
        expect(mail.html).toContain("Tahoma")
    })

    it("translates the SUBJECT too, not just the body", async () => {
        // A body in Arabic under an English subject is the failure this guards.
        const ar = await renderTemplate("order-confirmation", "ar", PAYLOADS["order-confirmation"])
        const en = await renderTemplate("order-confirmation", "en", PAYLOADS["order-confirmation"])
        expect(ar.subject).not.toBe(en.subject)
        expect(ar.subject).toMatch(/[؀-ۿ]/)
        expect(en.subject).toMatch(/^[\x20-\x7E]+$/)
    })

    it("keeps English left-to-right", async () => {
        const mail = await renderTemplate("order-confirmation", "en", PAYLOADS["order-confirmation"])
        expect(mail.html).toContain('dir="ltr"')
    })
})

describe("content", () => {
    it("puts the money and the order number where a customer will look", async () => {
        const mail = await renderTemplate("order-confirmation", "en", PAYLOADS["order-confirmation"])
        expect(mail.text).toContain("NL-1")
        expect(mail.text).toContain("400.00")
        expect(mail.text).toContain("EGP")
    })

    it("includes the link as text, for clients that strip the button", async () => {
        const mail = await renderTemplate("email-verification", "ar", PAYLOADS["email-verification"])
        expect(mail.html).toContain("https://x.invalid/v?t=1")
        expect(mail.text).toContain("https://x.invalid/v?t=1")
    })

    it("omits an absent optional field instead of rendering 'undefined'", async () => {
        const mail = await renderTemplate("order-status-change", "en", {
            orderNumber: "NL-2", status: "delivered", orderUrl: "https://x.invalid/o/2",
        })
        expect(mail.html).not.toContain("undefined")
        expect(mail.text).not.toContain("undefined")
    })
})
