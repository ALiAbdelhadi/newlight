import { getTranslations } from "next-intl/server"
import { PrivacyClient } from "./privacy"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "privacy-page" })

    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    }
}

export const revalidate = 86400

export default async function PrivacyPage() {
    return <PrivacyClient />
}