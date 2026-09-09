import { prisma } from "@repo/database"
import { getLocale } from "next-intl/server"
import { SupportedLanguage } from "@/types"

export async function getLocaleOrDefault(locale?: string): Promise<SupportedLanguage> {
    if (locale) return locale as SupportedLanguage
    try {
        const currentLocale = await getLocale()
        return (currentLocale || "en") as SupportedLanguage
    } catch {
        return "en"
    }
}
