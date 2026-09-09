/**
 * The mail interface.
 *
 * Nodemailer-shaped (`to`, `subject`, `html`, `text`, `from`, `replyTo`), because the transport
 * is a runtime choice and should not be visible to a single call site. Two implement it today:
 * transport/smtp.ts (Nodemailer, chosen when SMTP_HOST is set) and transport/resend.ts (HTTP
 * API, for serverless deployments where a persistent SMTP connection is unreliable). A third
 * would be one more file in transport/ and one more branch in `transport()`.
 */

export type MailLocale = "en" | "ar"

/** The six templates §16 requires. A string union, so a typo is a compile error. */
export type MailTemplate =
    | "email-verification"
    | "password-reset"
    | "order-confirmation"
    | "order-status-change"
    | "contact-acknowledgement"
    | "contact-admin-notification"

export interface MailAddress {
    email: string
    name?: string
}

export interface MailInput {
    to: string | MailAddress
    subject: string
    html: string
    /** Always send one. A mail with no text part reads as spam to several filters. */
    text: string
    from?: string
    replyTo?: string
    /** Surfaced to the transport for tracing; never rendered. */
    tags?: Record<string, string>
}

export interface MailResult {
    /** The provider's id for the message, when it gives one. */
    id: string | null
    provider: string
}

/**
 * A transport MAY throw. `sendMail` is what guarantees a failure never reaches a request
 * path — see the note in index.ts.
 */
export interface MailTransport {
    readonly name: string
    send(input: MailInput): Promise<MailResult>
}

export class MailConfigurationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "MailConfigurationError"
    }
}

export class MailTransportError extends Error {
    constructor(
        message: string,
        readonly status?: number,
        readonly retryable = true
    ) {
        super(message)
        this.name = "MailTransportError"
    }
}
