import { getLocale, getTranslations } from "next-intl/server"
import { resolveLocale } from "@repo/database"
import { CategoryService } from "@/lib/services/category-service"
import { constructMetadata } from "@/lib/metadata"
import CategoriesSection from "./category"

export const revalidate = 14400

export async function generateMetadata() {
    const t = await getTranslations("metadatas.category-page")
    const locale = resolveLocale(await getLocale())
    return constructMetadata({ title: t("title"), description: t("description"), locale })
}

/**
 * Every category, from the data.
 *
 * v1 asked for "indoor" and "outdoor" by name, because CategoryType was an enum with those two
 * values. It is gone (§3): categories are ordinary rows, so this lists whatever exists and a
 * third one needs no code change. The slug comes off the TRANSLATION row, which is what makes
 * the Arabic listing link to Arabic URLs.
 */
export default async function CategoriesPage() {
    const locale = resolveLocale(await getLocale())
    const all = await CategoryService.getAllCategories(locale)

    const categories = all.flatMap((category) => {
        const translation = category.translations[0]
        if (!translation) {
            console.warn(`[category] ${category.id} has no ${locale} translation; omitted`)
            return []
        }
        return [{
            key: category.id,
            slug: translation.slug,
            name: translation.name,
            description: translation.description ?? "",
            imageUrl: category.imageUrl ?? category.subCategories[0]?.imageUrl ?? "",
        }]
    })

    return <CategoriesSection categories={categories} />
}
