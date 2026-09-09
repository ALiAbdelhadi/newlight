"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"
import { requestPasswordReset } from "@/lib/auth-client"
import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "./auth-form"

export function ForgotPasswordForm() {
    const t = useTranslations("auth")
    const locale = useLocale()
    const [sent, setSent] = useState(false)
    const [pending, setPending] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPending(true)
        const form = new FormData(event.currentTarget)
        await requestPasswordReset({
            email: String(form.get("email") ?? ""),
            redirectTo: `/${locale}/reset-password`,
        })
        setPending(false)
        setSent(true)
    }

    return (
        <AuthShell title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
            {sent ? (
                <AuthMessage tone="success">{t("resetSent")}</AuthMessage>
            ) : (
                <form onSubmit={onSubmit} noValidate>
                    <AuthField id="email" label={t("email")} type="email" autoComplete="email" dir="ltr" autoFocus />
                    <AuthSubmit pending={pending}>{pending ? t("working") : t("submitForgot")}</AuthSubmit>
                </form>
            )}
        </AuthShell>
    )
}
