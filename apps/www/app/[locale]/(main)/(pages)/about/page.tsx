import { getTranslations, setRequestLocale } from "next-intl/server"
import { AboutUsClient } from "./about"
import type { Metadata } from "next"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "about-us-page" })

    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    }
}

export default async function AboutUsPage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    setRequestLocale(locale)

    return <AboutUsClient />
}
