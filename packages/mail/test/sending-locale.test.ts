import { afterEach, describe, expect, it } from "vitest"
import { __setTransportForTesting, sendTemplate, type MailInput, type MailResult, type MailTransport } from "../index"

function capturingTransport(): { transport: MailTransport; sent: MailInput[] } {
    const sent: MailInput[] = []
    const transport: MailTransport = {
        name: "capture",
        async send(input: MailInput): Promise<MailResult> {
            sent.push(input)
            return { id: "captured", provider: "capture" }
        },
    }
    return { transport, sent }
}

afterEach(() => {
    __setTransportForTesting(null)
})

describe("sendTemplate ignores the requested locale", () => {
    it("sends English to a customer whose locale is Arabic", async () => {
        const { transport, sent } = capturingTransport()
        __setTransportForTesting(transport)

        await sendTemplate("order-confirmation", "customer@example.com", "ar", {
            orderNumber: "NL-1",
            items: [{ name: "Lamp", quantity: 1, price: "10.00" }],
            subtotal: "10.00",
            shippingCost: "0.00",
            total: "10.00",
            currency: "EGP",
            address: { fullName: "a", phone: "b", addressLine1: "c", city: "d", country: "e" },
            orderUrl: "https://x.invalid",
        })

        const mail = sent[0]!
        expect(mail.subject).toBe("Order NL-1 confirmed")
        expect(mail.html).toContain('dir="ltr"')
        expect(mail.html).not.toContain('dir="rtl"')
    })

    it("sends the same English verification whichever locale is asked for", async () => {
        const { transport, sent } = capturingTransport()
        __setTransportForTesting(transport)

        const payload = { verifyUrl: "https://x.invalid", expiresInMinutes: 30 }
        await sendTemplate("email-verification", "customer@example.com", "ar", payload)
        await sendTemplate("email-verification", "customer@example.com", "en", payload)

        expect(sent[0]!.subject).toBe("Confirm your email address")
        expect(sent[0]!.subject).toBe(sent[1]!.subject)
        expect(sent[0]!.text).toBe(sent[1]!.text)
    })
})
