import { notFound } from "next/navigation"
import { getProductsBySubCategory } from "@repo/database"
import { getLocale } from "next-intl/server"
import SectionTypePage from "./section-type"

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

    return <SectionTypePage subCategory={category} locale={currentLocale} />
}
