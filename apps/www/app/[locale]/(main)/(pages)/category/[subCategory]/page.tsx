
import { getLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import SubCategoryPage from "./sub-category"
import { getCategoryByType } from "@/lib/db"

export const revalidate = 7200
export const dynamic = "force-dynamic"

export async function generateStaticParams() {
    // Pre-generate pages for known category types
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
