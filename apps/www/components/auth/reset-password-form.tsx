"use client"

import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"
import { resetPassword } from "@/lib/auth-client"
import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "./auth-form"

const MIN_PASSWORD = 10

export function ResetPasswordForm({ token }: { token: string | null }) {
    const t = useTranslations("auth")
    const locale = useLocale()
    const router = useRouter()
    const [error, setError] = useState<string | null>(token ? null : t("genericError"))
    const [pending, setPending] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!token) return
        setError(null)

        const form = new FormData(event.currentTarget)
        const password = String(form.get("password") ?? "")
        if (password !== String(form.get("confirmPassword") ?? "")) return setError(t("passwordMismatch"))
        if (password.length < MIN_PASSWORD) return setError(t("passwordTooShort", { min: MIN_PASSWORD }))

        setPending(true)
        const result = await resetPassword({ newPassword: password, token })
        setPending(false)

        if (result.error) return setError(t("genericError"))
        router.push(`/${locale}/sign-in`)
    }

    return (
        <AuthShell title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
            <form onSubmit={onSubmit} noValidate>
                <AuthMessage tone="error">{error}</AuthMessage>
                <AuthField id="password" label={t("password")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD} />
                <AuthField id="confirmPassword" label={t("confirmPassword")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD} />
                <AuthSubmit pending={pending || !token}>{pending ? t("working") : t("submitForgot")}</AuthSubmit>
            </form>
        </AuthShell>
    )
}
