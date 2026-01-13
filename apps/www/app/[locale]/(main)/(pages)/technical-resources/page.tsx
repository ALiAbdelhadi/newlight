import TechnicalResources from "@/components/technical-resources";
import { constructMetadata } from "@/lib/metadata";
import { SupportedLanguage } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
    const t = await getTranslations("metadatas.technical-resources");
    const locale = await getLocale() as SupportedLanguage
    return constructMetadata({
        title: t("title"),
        description: t("description"),
        locale: locale as SupportedLanguage,
    });
}

export default async function TechnicalPage() {
    return <TechnicalResources />
}