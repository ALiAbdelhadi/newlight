/**
 * Nodemailer, over SMTP.
 *
 * The sibling of transport/resend.ts, and chosen the same way: at runtime, from the
 * environment. Nothing above `transport()` knows which of the two is in use, which is the
 * property types.ts was shaped to preserve.
 *
 * The transporter is created once and reused. Nodemailer pools connections itself, and a new
 * transporter per send would pay the TCP + TLS + AUTH handshake on every email. On a
 * long-lived Node process that is simply waste; on a serverless function the pool cannot
 * survive the freeze anyway, which is why `pool` is opt-in via SMTP_POOL rather than assumed.
 *
 * Errors are classified into retryable and not, on the same rule the outbox depends on: a
 * 5xx SMTP reply is permanent (bad recipient, rejected sender, message refused) and will fail
 * identically on every retry, a 4xx is a transient deferral, and anything without a code —
 * socket reset, DNS, timeout — is worth another attempt.
 */
import nodemailer, { type Transporter } from "nodemailer"
import { MailConfigurationError, MailTransportError, type MailInput, type MailResult, type MailTransport } from "../types"

export interface SmtpConfig {
    host: string
    port: number
    /** Implicit TLS on connect (port 465). Port 587 uses STARTTLS instead and wants `false`. */
    secure: boolean
    user?: string
    pass?: string
    pool: boolean
}

/**
 * Read SMTP settings from the environment. Returns null — not a throw — when the host is
 * absent, because "no SMTP configured" is a routing decision for `transport()` to make, not
 * an error.
 */
export function smtpConfigFromEnv(): SmtpConfig | null {
    const host = process.env.SMTP_HOST
    if (!host) return null

    const port = Number(process.env.SMTP_PORT ?? 587)
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new MailConfigurationError(`SMTP_PORT is not a valid port: ${process.env.SMTP_PORT}`)
    }

    // Default from the port rather than from a third variable nobody remembers to set.
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

/**
 * An SMTP reply code, when nodemailer gives one. `responseCode` is the numeric reply from the
 * server; `code` is nodemailer's own label for failures that never reached a server.
 */
function isRetryable(error: unknown): boolean {
    const err = error as { responseCode?: number; code?: string }
    if (typeof err?.responseCode === "number") {
        // 4xx is a deferral and worth retrying. 5xx is a rejection and will not improve.
        return err.responseCode < 500
    }
    // No reply code at all: the failure was below SMTP — socket, DNS, TLS, timeout.
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
            // Unauthenticated SMTP is legitimate for a local relay (MailHog, Mailpit, Postfix).
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
                    // SMTP has no tag field. Headers are the equivalent, and they survive to the
                    // recipient's mail log, which is where tracing a single message actually starts.
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
