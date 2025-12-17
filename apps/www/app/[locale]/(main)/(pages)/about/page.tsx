import { constructMetadata } from "@/lib/metadata";
import { SupportedLanguage } from "@/types";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { AboutUsClient } from "./about";

export async function generateMetadata() {
    const t = await getTranslations("metadatas.about-us-page");

    const locale = await getLocale() as SupportedLanguage
    return constructMetadata({
        title: t("title"),
        description: t("description"),
        locale: locale as SupportedLanguage,
    });
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
