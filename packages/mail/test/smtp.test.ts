import { afterEach, describe, expect, it, vi } from "vitest"
import { MailConfigurationError, MailTransportError } from "../types"
import { smtpConfigFromEnv, smtpTransport } from "../transport/smtp"

const sendMailMock = vi.fn()
vi.mock("nodemailer", () => ({
    default: { createTransport: () => ({ sendMail: (...args: unknown[]) => sendMailMock(...args) }) },
}))

const ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "SMTP_POOL"] as const

afterEach(() => {
    sendMailMock.mockReset()
    for (const key of ENV_KEYS) delete process.env[key]
})

describe("smtpConfigFromEnv", () => {
    it("returns null when no host is configured", () => {
        expect(smtpConfigFromEnv()).toBeNull()
    })

    it("derives `secure` from the port when SMTP_SECURE is unset", () => {
        process.env.SMTP_HOST = "smtp.example.com"
        process.env.SMTP_PORT = "465"
        expect(smtpConfigFromEnv()?.secure).toBe(true)

        process.env.SMTP_PORT = "587"
        expect(smtpConfigFromEnv()?.secure).toBe(false)
    })

    it("lets SMTP_SECURE override the port-derived default", () => {
        process.env.SMTP_HOST = "smtp.example.com"
        process.env.SMTP_PORT = "587"
        process.env.SMTP_SECURE = "true"
        expect(smtpConfigFromEnv()?.secure).toBe(true)
    })

    it("defaults to port 587 with no pool", () => {
        process.env.SMTP_HOST = "smtp.example.com"
        expect(smtpConfigFromEnv()).toMatchObject({ port: 587, pool: false })
    })

    it("rejects a port that is not a port", () => {
        process.env.SMTP_HOST = "smtp.example.com"
        process.env.SMTP_PORT = "not-a-number"
        expect(() => smtpConfigFromEnv()).toThrow(MailConfigurationError)
    })
})

describe("smtpTransport", () => {
    const config = { host: "smtp.example.com", port: 587, secure: false, pool: false }
    const mail = { to: "customer@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" }

    it("refuses a user without a password", () => {
        expect(() => smtpTransport({ ...config, user: "u" }, "no-reply@mail.newlight-eg.com")).toThrow(MailConfigurationError)
    })

    it("refuses an empty EMAIL_FROM", () => {
        expect(() => smtpTransport(config, "")).toThrow(MailConfigurationError)
    })

    it("sends with the configured default from, and returns the message id", async () => {
        sendMailMock.mockResolvedValue({ messageId: "<abc@mail.newlight-eg.com>" })
        const result = await smtpTransport(config, "Newlight <no-reply@mail.newlight-eg.com>").send(mail)

        expect(sendMailMock).toHaveBeenCalledWith(
            expect.objectContaining({ from: "Newlight <no-reply@mail.newlight-eg.com>", to: "customer@example.com" })
        )
        expect(result).toEqual({ id: "<abc@mail.newlight-eg.com>", provider: "smtp" })
    })

    it("maps tags onto X-Mail-* headers", async () => {
        sendMailMock.mockResolvedValue({ messageId: "<abc@mail.newlight-eg.com>" })
        await smtpTransport(config, "no-reply@mail.newlight-eg.com").send({ ...mail, tags: { template: "order-confirmation" } })

        expect(sendMailMock).toHaveBeenCalledWith(
            expect.objectContaining({ headers: { "X-Mail-template": "order-confirmation" } })
        )
    })

    it("treats a 5xx reply as permanent", async () => {
        sendMailMock.mockRejectedValue(Object.assign(new Error("Mailbox unavailable"), { responseCode: 550 }))
        await expect(smtpTransport(config, "no-reply@mail.newlight-eg.com").send(mail)).rejects.toMatchObject({
            name: "MailTransportError",
            status: 550,
            retryable: false,
        })
    })

    it("treats a 4xx reply as a deferral worth retrying", async () => {
        sendMailMock.mockRejectedValue(Object.assign(new Error("Try again later"), { responseCode: 451 }))
        await expect(smtpTransport(config, "no-reply@mail.newlight-eg.com").send(mail)).rejects.toMatchObject({ retryable: true })
    })

    it("treats a failure with no reply code as retryable", async () => {
        sendMailMock.mockRejectedValue(Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }))
        const error = await smtpTransport(config, "no-reply@mail.newlight-eg.com").send(mail).catch((e) => e)
        expect(error).toBeInstanceOf(MailTransportError)
        expect(error.retryable).toBe(true)
    })
})
