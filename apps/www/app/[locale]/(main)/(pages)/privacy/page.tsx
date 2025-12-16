import { constructMetadata } from "@/lib/metadata";
import { getLocale, getTranslations } from "next-intl/server";
import { PrivacyClient } from "./privacy";
import { SupportedLanguage } from "@/types";

export async function generateMetadata() {
    const t = await getTranslations("metadatas.privacy-page");
    const locale = await getLocale() as SupportedLanguage
    return constructMetadata({
        title: t("title"),
        description: t("description"),
        locale
    });
}

export const revalidate = 86400

export default async function PrivacyPage() {
    return <PrivacyClient />
}