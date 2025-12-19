import { getProductsWithUniqueVariants, getSubCategories } from "@/lib/db"
import { constructMetadata } from "@/lib/metadata"
import { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import SectionTypePage from "./section-type"
import { SupportedLanguage } from "@/types"

export const revalidate = 3600
export const dynamic = "force-dynamic"
export const dynamicParams = true

type Props = {
    params: Promise<{
        subCategory: string
        sectionType: string
        locale: string
    }>
}

type MetadataProps = {
    params: Promise<{
        subCategory: string
        sectionType: string
    }>
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    const { subCategory, sectionType } = await params

    const locale = await getLocale() as SupportedLanguage
    const t = await getTranslations("metadatas.section-type-page")

    const data = await getProductsWithUniqueVariants(subCategory, sectionType, locale)

    if (!data) {
        notFound()
    }

    const subCategoryName = data.translations[0]?.name || data.slug
    const categoryName = data.category.translations[0]?.name || data.category.categoryType

    const firstProductImage = data.products?.[0]?.images?.[0] ||
        data.imageUrl ||
        undefined

    return constructMetadata({
        title: t("title", {
            section: subCategoryName,
            category: categoryName,
        }),
        description: t("description", {
            section: subCategoryName,
            category: categoryName,
        }),
        locale: locale as SupportedLanguage,
        image: firstProductImage,
    })
}

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
        return []
    }
}

export default async function CategorySectionTypePage({ params }: Props) {
    const { subCategory, sectionType } = await params
    const currentLocale = await getLocale()

    const category = await getProductsWithUniqueVariants(subCategory, sectionType, currentLocale)

    if (!category) {
        notFound()
    }

    return <SectionTypePage subCategory={category} />
}