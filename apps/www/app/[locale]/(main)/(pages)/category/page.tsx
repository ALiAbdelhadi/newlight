import { getCategoryByType } from "@/lib/db"
import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import CategoriesSection from "./category"

export const revalidate = 14400

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadatas.category-page")

    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    }
}

export default async function CategoriesPage() {
    const locale = await getLocale()

    const [indoorCategory, outdoorCategory] = await Promise.all([
        getCategoryByType("indoor", locale),
        getCategoryByType("outdoor", locale),
    ])

    const categories = [
        indoorCategory
            ? {
                key: "indoor",
                slug: indoorCategory.slug,
                name: indoorCategory.translations[0]?.name || "Indoor",
                description: indoorCategory.translations[0]?.description || "",
                imageUrl: indoorCategory.subCategories[0]?.imageUrl ,
            }
            : null,
        outdoorCategory
            ? {
                key: "outdoor",
                slug: outdoorCategory.slug,
                name: outdoorCategory.translations[0]?.name || "Outdoor",
                description: outdoorCategory.translations[0]?.description || "",
                imageUrl: outdoorCategory.subCategories[1]?.imageUrl,
            }
            : null,
    ].filter(Boolean) as Array<{
        key: string
        slug: string
        name: string
        description: string
        imageUrl: string
    }>

    return <CategoriesSection categories={categories} />
}
