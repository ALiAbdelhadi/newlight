import { getCategoryByType } from "@/lib/db"
import { constructMetadata } from "@/lib/metadata"
import { SupportedLanguage } from "@/types"
import { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import SubCategoryPage from "./sub-category"

export const revalidate = 7200
export const dynamic = "force-dynamic"

type MetadataProps = {
    params: Promise<{
        subCategory: string
    }>
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    const { subCategory } = await params
    const locale = await getLocale() as SupportedLanguage
    const t = await getTranslations("metadatas.sub-category-page")

    const categoryType = subCategory as "indoor" | "outdoor"

    if (categoryType !== "indoor" && categoryType !== "outdoor") {
        notFound()
    }

    const category = await getCategoryByType(categoryType, locale)

    if (!category) {
        notFound()
    }

    const categoryName = category.translations[0]?.name || category.categoryType

    const categoryImage = category.subCategories?.[0]?.imageUrl ||
        category.imageUrl ||
        undefined

    const subCategoryNames = category.subCategories
        ?.slice(0, 8)
        .map(sub => sub.translations[0]?.name)
        .filter(Boolean)
        .join(", ") || ""

    return constructMetadata({
        title: t("title", { category: categoryName }),
        description: t("description", { category: categoryName }),
        locale: locale as SupportedLanguage,
        image: categoryImage,
        keywords: subCategoryNames,
    })
}

export async function generateStaticParams() {
    const locales = ["en", "ar"]
    const subCategories = ["indoor", "outdoor"]

    return locales.flatMap((locale) =>
        subCategories.map((subCategory) => ({
            locale,
            subCategory,
        })),
    )
}

type Props = {
    params: Promise<{
        subCategory: string
        locale: string
    }>
}

export default async function CategorySubCategoryPage({ params }: Props) {
    const { subCategory } = await params
    const currentLocale = await getLocale()
    const categoryType = subCategory as "indoor" | "outdoor"

    if (categoryType !== "indoor" && categoryType !== "outdoor") {
        notFound()
    }

    const category = await getCategoryByType(categoryType, currentLocale)

    if (!category) {
        notFound()
    }

    return <SubCategoryPage category={category} />
}