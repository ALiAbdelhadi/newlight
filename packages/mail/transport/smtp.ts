import nodemailer, { type Transporter } from "nodemailer"
import { MailConfigurationError, MailTransportError, type MailInput, type MailResult, type MailTransport } from "../types"

export interface SmtpConfig {
    host: string
    port: number
    secure: boolean
    user?: string
    pass?: string
    pool: boolean
}

export function smtpConfigFromEnv(): SmtpConfig | null {
    const host = process.env.SMTP_HOST
    if (!host) return null

    const port = Number(process.env.SMTP_PORT ?? 587)
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new MailConfigurationError(`SMTP_PORT is not a valid port: ${process.env.SMTP_PORT}`)
    }

    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465

    return {
        host,
        port,
        secure,
        user: process.env.SMTP_USER || undefined,
        pass: process.env.SMTP_PASSWORD || undefined,
        pool: process.env.SMTP_POOL === "true",
    }
}

function formatAddress(to: MailInput["to"]): string {
    if (typeof to === "string") return to
    return to.name ? `${to.name} <${to.email}>` : to.email
}

function isRetryable(error: unknown): boolean {
    const err = error as { responseCode?: number; code?: string }
    if (typeof err?.responseCode === "number") {
        return err.responseCode < 500
    }
    return true
}

export function smtpTransport(config: SmtpConfig, defaultFrom: string): MailTransport {
    if (!config.host) throw new MailConfigurationError("SMTP_HOST is not set")
    if (!defaultFrom) throw new MailConfigurationError("EMAIL_FROM is not set")
    if (config.user && !config.pass) throw new MailConfigurationError("SMTP_USER is set but SMTP_PASSWORD is not")

    let transporter: Transporter | null = null

    function client(): Transporter {
        if (transporter) return transporter
        transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            pool: config.pool,
            ...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
        })
        return transporter
    }

    return {
        name: "smtp",
        async send(input: MailInput): Promise<MailResult> {
            try {
                const info = await client().sendMail({
                    from: input.from ?? defaultFrom,
                    to: formatAddress(input.to),
                    subject: input.subject,
                    html: input.html,
                    text: input.text,
                    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
                    ...(input.tags
                        ? { headers: Object.fromEntries(Object.entries(input.tags).map(([k, v]) => [`X-Mail-${k}`, v])) }
                        : {}),
                })
                return { id: info.messageId ?? null, provider: "smtp" }
            } catch (error) {
                const retryable = isRetryable(error)
                const message = error instanceof Error ? error.message : String(error)
                throw new MailTransportError(
                    `smtp: ${message}`,
                    (error as { responseCode?: number })?.responseCode,
                    retryable
                )
            }
        },
    }
}
