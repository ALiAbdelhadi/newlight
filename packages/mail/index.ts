import { consoleTransport } from "./transport/console"
import { resendConfigFromEnv, resendTransport } from "./transport/resend"
import { renderTemplate } from "./templates/index"
import type { PayloadByTemplate } from "./templates/payloads"
import { MailTransportError, type MailInput, type MailLocale, type MailResult, type MailTemplate, type MailTransport } from "./types"

export * from "./types"
export type * from "./templates/payloads"
export { renderTemplate } from "./templates/index"

export type SendOutcome =
    | { ok: true; result: MailResult }
    | { ok: false; error: string; retryable: boolean }

let cached: MailTransport | null = null

export function transport(): MailTransport {
    if (cached) return cached
    const from = process.env.EMAIL_FROM
    const resend = resendConfigFromEnv()

    cached = from && resend ? resendTransport(resend, from) : consoleTransport()

    if (cached.name === "console") {
        console.warn("[mail] no RESEND_API_KEY or no EMAIL_FROM — mail will be logged, not delivered.")
    }
    return cached
}

export function __setTransportForTesting(next: MailTransport | null): void {
    cached = next
}

export async function sendMail(input: MailInput): Promise<SendOutcome> {
    try {
        const result = await transport().send({
            ...input,
            replyTo: input.replyTo ?? process.env.EMAIL_REPLY_TO,
        })
        return { ok: true, result }
    } catch (error) {
        const retryable = error instanceof MailTransportError ? error.retryable : true
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[mail] send failed (${retryable ? "retryable" : "permanent"}): ${message}`)
        return { ok: false, error: message, retryable }
    }
}

export async function sendTemplate<T extends MailTemplate>(
    template: T,
    to: string,
    locale: MailLocale,
    payload: PayloadByTemplate[T]
): Promise<SendOutcome> {
    const rendered = await renderTemplate(template, locale, payload)
    return sendMail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, tags: { template } })
}
