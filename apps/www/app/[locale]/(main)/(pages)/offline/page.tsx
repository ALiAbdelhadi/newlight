import { constructMetadata } from "@/lib/metadata";
import { SupportedLanguage } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
    const t = await getTranslations("metadatas.offline");

    const locale = await getLocale() as SupportedLanguage
    return constructMetadata({
        title: t("title"),
        description: t("description"),
        locale: locale as SupportedLanguage,
    });
}

export default async function OfflinePage() {
    const t = await getTranslations("offline");
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold">{t("title")}</h1>
                <p className="mt-4 text-muted-foreground">
                    {t("description")}
                </p>
            </div>
        </div>
    );
}