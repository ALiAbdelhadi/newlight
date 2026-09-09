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
                throw new MailTransportError(`resend: ${error instanceof Error ? error.message : String(error)}`, undefined, true)
            }

            if (!response.ok) {
                const body = await response.text()
                const retryable = response.status === 429 || response.status >= 500
                throw new MailTransportError(`resend ${response.status}: ${body}`, response.status, retryable)
            }

            const result = (await response.json()) as { id?: string }
            return { id: result.id ?? null, provider: "resend" }
        },
    }
}
