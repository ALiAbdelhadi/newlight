"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"
import { signUp } from "@/lib/auth-client"
import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "./auth-form"

const MIN_PASSWORD = 10

export function SignUpForm() {
    const t = useTranslations("auth")
    const locale = useLocale()
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)
    const [pending, setPending] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        const form = new FormData(event.currentTarget)
        const password = String(form.get("password") ?? "")
        if (password !== String(form.get("confirmPassword") ?? "")) return setError(t("passwordMismatch"))
        if (password.length < MIN_PASSWORD) return setError(t("passwordTooShort", { min: MIN_PASSWORD }))

        setPending(true)
        const result = await signUp.email({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password,
            preferredLanguage: locale,
            phoneNumber: String(form.get("phoneNumber") ?? "") || undefined,
        })
        setPending(false)

        if (result.error) {
            const code = result.error.code ?? ""
            setError(code.includes("EXISTING") || code.includes("EXISTS") ? t("emailInUse") : t("genericError"))
            return
        }
        setSent(true)
    }

    if (sent) {
        return (
            <AuthShell title={t("signUpTitle")} subtitle={t("signUpSubtitle")}>
                <AuthMessage tone="success">{t("verifySent")}</AuthMessage>
            </AuthShell>
        )
    }

    return (
        <AuthShell
            title={t("signUpTitle")}
            subtitle={t("signUpSubtitle")}
            footer={
                <span className="text-muted-foreground">
                    {t("haveAccount")}{" "}
                    <a href={`/${locale}/sign-in`} className="text-primary transition-colors hover:text-primary/80">
                        {t("submitSignIn")}
                    </a>
                </span>
            }
        >
            <form onSubmit={onSubmit} noValidate>
                <AuthMessage tone="error">{error}</AuthMessage>
                <AuthField id="name" label={t("name")} autoComplete="name" />
                <AuthField id="email" label={t("email")} type="email" autoComplete="email" />
                <AuthField id="phoneNumber" label={t("phone")} type="tel" autoComplete="tel" required={false} />
                <AuthField id="password" label={t("password")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD} />
                <AuthField id="confirmPassword" label={t("confirmPassword")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD} />
                <AuthSubmit pending={pending}>{pending ? t("working") : t("submitSignUp")}</AuthSubmit>
            </form>
        </AuthShell>
    )
}
