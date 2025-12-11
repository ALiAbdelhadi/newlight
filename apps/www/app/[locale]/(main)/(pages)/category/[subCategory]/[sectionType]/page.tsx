import { notFound } from "next/navigation"
import { getLocale } from "next-intl/server"
import SectionTypePage from "./section-type"
import { getProductsBySubCategory, getSubCategories } from "@/lib/db"

export const revalidate = 3600

export async function generateStaticParams() {
    try {
        const locales = ["en", "ar"]
        const categoryTypes = ["indoor", "outdoor"]

        const params: Array<{ locale: string; subCategory: string; sectionType: string }> = []

        for (const locale of locales) {
            for (const categoryType of categoryTypes) {
                const subCategories = await getSubCategories(categoryType, locale)
                for (const subCategory of subCategories) {
                    params.push({
                        locale,
                        subCategory: categoryType,
                        sectionType: subCategory.slug,
                    })
                }
            }
        }

        return params
    } catch {
        // Fallback: return empty array, pages will be generated on-demand
        return []
    }
}

export const dynamicParams = true

type Props = {
    params: Promise<{
        subCategory: string
        sectionType: string
        locale: string
    }>
}

export default async function CategorySectionTypePage({ params }: Props) {
    const { subCategory, sectionType } = await params
    const currentLocale = await getLocale()
    const category = await getProductsBySubCategory(subCategory, sectionType, currentLocale)

    if (!category) {
        notFound()
    }

    return <SectionTypePage subCategory={category} />
}
