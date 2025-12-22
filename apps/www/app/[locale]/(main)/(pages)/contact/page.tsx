import { constructMetadata } from "@/lib/metadata";
import { SupportedLanguage } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";
import ContactPage from "./contact";
import { createPageCanonicalUrl } from "@/lib/canonical-url";

export async function generateMetadata() {
    const t = await getTranslations("metadatas.contact");
    const locale = await getLocale() as SupportedLanguage;
    const canonicalUrl = createPageCanonicalUrl({
        locale,
        path: 'contact'
    })
    return constructMetadata({
        title: t("title"),
        description: t("description"),
        locale: locale as SupportedLanguage,
        canonicalUrl
    });
}

export default async function Page() {
    return <ContactPage />;
}