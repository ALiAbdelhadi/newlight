import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { AuthSplit } from "@/components/auth/auth-split"
import { ThemedSignIn } from "@/components/theme-sign-in"

export default async function SignInPage() {
    const t = await getTranslations("auth")

    return (
        <AuthSplit headline={t("welcomeBack")} body={t("welcomeBackBody")} imageClassName="object-center">
            <Suspense
                fallback={
                    <div role="status" aria-live="polite" className="flex items-center justify-center py-16">
                        <span className="text-sm text-muted-foreground">{t("loading")}</span>
                    </div>
                }
            >
                <ThemedSignIn />
            </Suspense>
        </AuthSplit>
    )
}
