"use client"

import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"
import { signIn } from "@/lib/auth-client"
import { AuthField, AuthMessage, AuthShell, AuthSubmit } from "./auth-form"

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
    const t = useTranslations("auth")
    const locale = useLocale()
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setPending(true)

        const form = new FormData(event.currentTarget)
        const result = await signIn.email({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
        })

        setPending(false)
        if (result.error) {
            const code = result.error.code ?? ""
            setError(
                code.includes("EMAIL_NOT_VERIFIED")
                    ? t("unverified")
                    : code.includes("INVALID")
                        ? t("invalidCredentials")
                        : t("genericError")
            )
            return
        }
        router.push(redirectTo ?? `/${locale}`)
        router.refresh()
    }

    return (
        <AuthShell
            title={t("signInTitle")}
            subtitle={t("signInSubtitle")}
            footer={
                <div className="flex flex-col gap-2">
                    <a href={`/${locale}/forgot-password`} className="text-primary transition-colors hover:text-primary/80">
                        {t("forgotLink")}
                    </a>
                    <span className="text-muted-foreground">
                        {t("noAccount")}{" "}
                        <a href={`/${locale}/sign-up`} className="text-primary transition-colors hover:text-primary/80">
                            {t("submitSignUp")}
                        </a>
                    </span>
                </div>
            }
        >
            <form onSubmit={onSubmit} noValidate>
                <AuthMessage tone="error">{error}</AuthMessage>
                <AuthField id="email" label={t("email")} type="email" autoComplete="email" />
                <AuthField id="password" label={t("password")} type="password" autoComplete="current-password" />
                <AuthSubmit pending={pending}>{pending ? t("working") : t("submitSignIn")}</AuthSubmit>
            </form>
        </AuthShell>
    )
}
