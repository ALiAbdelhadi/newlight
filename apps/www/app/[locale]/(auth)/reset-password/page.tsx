import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { resolveLocale } from "@repo/database"

import { AuthCentered } from "@/components/auth/auth-split"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { constructMetadata } from "@/lib/metadata"
import { createPageCanonicalUrl } from "@/lib/canonical-url"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("auth")
    const locale = resolveLocale(await getLocale())
    return constructMetadata({
        title: t("forgotTitle"),
        description: t("forgotSubtitle"),
        locale,
        canonicalUrl: createPageCanonicalUrl({ locale, path: "reset-password" }),
        // Also blocked in robots.txt; noindex is belt-and-suspenders for a link-only path in.
        noIndex: true,
    })
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams
    return (
        <AuthCentered>
            <ResetPasswordForm token={token ?? null} />
        </AuthCentered>
    )
}
