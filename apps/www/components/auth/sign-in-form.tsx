"use client"

import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"
import { signIn } from "@/lib/auth-client"
import { Link } from "@/i18n/navigation"
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
                <span className="text-muted-foreground">
                    {t("noAccount")}{" "}
                    <Link
                        href="/sign-up"
                        className="text-primary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary/80 hover:underline"
                    >
                        {t("submitSignUp")}
                    </Link>
                </span>
            }
        >
            <form onSubmit={onSubmit} noValidate>
                <AuthMessage tone="error">{error}</AuthMessage>
                <AuthField id="email" label={t("email")} type="email" autoComplete="email" dir="ltr" autoFocus />
                <AuthField
                    id="password"
                    label={t("password")}
                    type="password"
                    autoComplete="current-password"
                    dir="ltr"
                />

                <div className="mb-6 -mt-1 flex justify-end">
                    <Link
                        href="/forgot-password"
                        className="text-xs text-muted-foreground underline-offset-4 transition-colors duration-(--duration-fast) ltr:tracking-wide hover:text-foreground hover:underline"
                    >
                        {t("forgotLink")}
                    </Link>
                </div>

                <AuthSubmit pending={pending}>{pending ? t("working") : t("submitSignIn")}</AuthSubmit>
            </form>
        </AuthShell>
    )
}
