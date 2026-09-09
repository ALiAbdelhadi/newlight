/**
 * @repo/mail — the only way anything in this repository sends an email.
 *
 * No app imports Resend or Nodemailer, and no app imports React Email. That is the whole design: the
 * transport is a runtime choice, the templates are a rendering detail, and a call site says
 * only *what* to send and *to whom*.
 *
 * `sendMail` NEVER THROWS. §16 is explicit that a failed email must not fail an order, and
 * the honest way to guarantee that is for the failure to be a return value rather than an
 * exception a caller might forget to catch. Callers that need to react to a failure read
 * `result.ok`; callers that do not can ignore it safely.
 *
 * Sending directly is for mail with no business event behind it. Anything that accompanies a
 * committed change — an order, a contact form — goes through ./outbox instead, so the queueing
 * shares the transaction and the sending does not.
 */
import { consoleTransport } from "./transport/console"
import { resendTransport } from "./transport/resend"
import { smtpConfigFromEnv, smtpTransport } from "./transport/smtp"
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

/**
 * SMTP first, then Resend, then a logging transport.
 *
 * SMTP wins when SMTP_HOST is set because configuring it is a deliberate act — nobody sets a
 * mail host by accident — so the explicit choice should not be silently outranked by a
 * RESEND_API_KEY that is still sitting in the environment from an earlier deployment.
 *
 * The console fallback exists so that a developer with neither configured does not have to
 * comment out the send, which is how a codebase acquires a second, local-only code path.
 */
export function transport(): MailTransport {
    if (cached) return cached
    const from = process.env.EMAIL_FROM
    const smtp = smtpConfigFromEnv()
    const apiKey = process.env.RESEND_API_KEY

    if (from && smtp) cached = smtpTransport(smtp, from)
    else if (from && apiKey) cached = resendTransport(apiKey, from)
    else cached = consoleTransport()

    if (cached.name === "console") {
        console.warn("[mail] no SMTP_HOST, no RESEND_API_KEY, or no EMAIL_FROM — mail will be logged, not delivered.")
    }
    return cached
}

/** Test seam. Not exported through the package entry point by accident: it is named clearly. */
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

/** Render and send in one step, for mail with no outbox row behind it. */
export async function sendTemplate<T extends MailTemplate>(
    template: T,
    to: string,
    locale: MailLocale,
    payload: PayloadByTemplate[T]
): Promise<SendOutcome> {
    const rendered = await renderTemplate(template, locale, payload)
    return sendMail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, tags: { template } })
}
