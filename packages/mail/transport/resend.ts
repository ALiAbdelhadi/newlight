/**
 * Resend, over the HTTP API.
 *
 * HTTP rather than SMTP because Vercel's serverless functions cannot hold a persistent SMTP
 * connection reliably, and no SDK because this is one POST — a dependency here would hide
 * the only part worth reading, exactly as with the Cloudinary upload (ADR 0002).
 *
 * Errors are classified into retryable and not: a 422 for a malformed address will fail
 * identically on every retry, and retrying it forever is how an outbox turns into a queue of
 * permanent failures that nobody looks at.
 */
import { MailConfigurationError, MailTransportError, type MailInput, type MailResult, type MailTransport } from "../types"

const ENDPOINT = "https://api.resend.com/emails"

function formatAddress(to: MailInput["to"]): string {
    if (typeof to === "string") return to
    return to.name ? `${to.name} <${to.email}>` : to.email
}

export function resendTransport(apiKey: string, defaultFrom: string): MailTransport {
    if (!apiKey) throw new MailConfigurationError("RESEND_API_KEY is not set")
    if (!defaultFrom) throw new MailConfigurationError("EMAIL_FROM is not set")

    return {
        name: "resend",
        async send(input: MailInput): Promise<MailResult> {
            let response: Response
            try {
                response = await fetch(ENDPOINT, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        from: input.from ?? defaultFrom,
                        to: [formatAddress(input.to)],
                        subject: input.subject,
                        html: input.html,
                        text: input.text,
                        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
                        ...(input.tags
                            ? { tags: Object.entries(input.tags).map(([name, value]) => ({ name, value })) }
                            : {}),
                    }),
                })
            } catch (error) {
                // A network failure is always worth retrying.
                throw new MailTransportError(`resend: ${error instanceof Error ? error.message : String(error)}`, undefined, true)
            }

            if (!response.ok) {
                const body = await response.text()
                // 4xx other than 429 is the caller's fault and will not improve on retry.
                const retryable = response.status === 429 || response.status >= 500
                throw new MailTransportError(`resend ${response.status}: ${body}`, response.status, retryable)
            }

            const result = (await response.json()) as { id?: string }
            return { id: result.id ?? null, provider: "resend" }
        },
    }
}
