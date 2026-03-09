import { prisma } from "@repo/database"
import { getLocale } from "next-intl/server"
import { SupportedLanguage } from "@/types"

/**
 * Shared utility to get the current locale or fallback to default
 */
export async function getLocaleOrDefault(locale?: string): Promise<SupportedLanguage> {
    if (locale) return locale as SupportedLanguage
    try {
        const currentLocale = await getLocale()
        return (currentLocale || "en") as SupportedLanguage
    } catch {
        return "en"
    }
}

// All data access logic has been migrated to dedicated services:
// - ProductService: apps/www/lib/services/product-service.ts
// - CategoryService: apps/www/lib/services/category-service.ts
// - SearchService: apps/www/lib/services/search-service.ts
// - OrderService: apps/www/lib/services/order-service.ts