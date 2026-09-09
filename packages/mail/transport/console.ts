import type { MailInput, MailResult, MailTransport } from "../types"

export function consoleTransport(): MailTransport {
    return {
        name: "console",
        async send(input: MailInput): Promise<MailResult> {
            const to = typeof input.to === "string" ? input.to : input.to.email
            console.info(`[mail:console] NOT DELIVERED — no SMTP_HOST or no EMAIL_FROM`)
            console.info(`[mail:console]   to      ${to}`)
            console.info(`[mail:console]   subject ${input.subject}`)
            console.info(`[mail:console]   text    ${input.text.slice(0, 400).replace(/\n/g, "\n[mail:console]           ")}`)
            return { id: null, provider: "console" }
        },
    }
}
