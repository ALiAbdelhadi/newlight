import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { AuthSplit } from "@/components/auth/auth-split"
import { ThemedSignUp } from "@/components/themed-sign-up"

export default async function SignUpPage() {
    const t = await getTranslations("auth")

    return (
        <AuthSplit headline={t("joinUs")} body={t("joinUsBody")} imageClassName="object-[50%_20%]">
            <Suspense
                fallback={
                    <div role="status" aria-live="polite" className="flex items-center justify-center py-16">
                        <span className="text-sm text-muted-foreground">{t("loading")}</span>
                    </div>
                }
            >
                <ThemedSignUp />
            </Suspense>
        </AuthSplit>
    )
}
