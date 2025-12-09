import { getCategoryByType } from "@repo/database"
import { getLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import SubCategoryPage from "./sub-category"

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

    return <SubCategoryPage category={category} locale={currentLocale} />
}
