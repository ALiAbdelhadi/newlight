import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { resolveLocale } from "@repo/database"

import { AuthCentered } from "@/components/auth/auth-split"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { constructMetadata } from "@/lib/metadata"
import { createPageCanonicalUrl } from "@/lib/canonical-url"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("auth")
    const locale = resolveLocale(await getLocale())
    return constructMetadata({
        title: t("forgotTitle"),
        description: t("forgotSubtitle"),
        locale,
        canonicalUrl: createPageCanonicalUrl({ locale, path: "forgot-password" }),
        // A utility step in the sign-in flow, not content — unlike the other auth pages it
        // isn't in robots.txt, so the noindex tag here is the only thing keeping it out.
        noIndex: true,
    })
}

export default function ForgotPasswordPage() {
    return (
        <AuthCentered>
            <ForgotPasswordForm />
        </AuthCentered>
    )
}
