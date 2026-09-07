/**
 * The development transport.
 *
 * Without it, a developer with no RESEND_API_KEY gets a configuration error on every sign-up
 * — so the natural fix is to comment out the send, and the codebase acquires a second path
 * that only exists locally. This logs instead, and says clearly that nothing was delivered.
 */
import type { MailInput, MailResult, MailTransport } from "../types"

export function consoleTransport(): MailTransport {
    return {
        name: "console",
        async send(input: MailInput): Promise<MailResult> {
            const to = typeof input.to === "string" ? input.to : input.to.email
            console.info(`[mail:console] NOT DELIVERED — no RESEND_API_KEY`)
            console.info(`[mail:console]   to      ${to}`)
            console.info(`[mail:console]   subject ${input.subject}`)
            console.info(`[mail:console]   text    ${input.text.slice(0, 400).replace(/\n/g, "\n[mail:console]           ")}`)
            return { id: null, provider: "console" }
        },
    }
}
