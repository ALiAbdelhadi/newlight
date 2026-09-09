export type MailLocale = "en" | "ar"

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
    text: string
    from?: string
    replyTo?: string
    tags?: Record<string, string>
}

export interface MailResult {
    id: string | null
    provider: string
}

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
