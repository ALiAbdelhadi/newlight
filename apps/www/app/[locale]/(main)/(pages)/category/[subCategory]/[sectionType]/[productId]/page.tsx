import { getProductById } from "@repo/database"
import { getLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import ProductIdPage from "./product-id"

type Props = {
    params: Promise<{
        subCategory: string
        sectionType: string
        productId: string
        locale: string
    }>
}

export default async function CategoryProductIdPage({ params }: Props) {
    const { productId } = await params
    const currentLocale = await getLocale()

    const product = await getProductById(productId, currentLocale)

    if (!product) {
        notFound()
    }

    return <ProductIdPage product={product} locale={currentLocale} />
}
