
import { getLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import ProductIdPage from "./product-id"
import { getAllProducts, getProductById } from "@/lib/db"

export const revalidate = 3600

export async function generateStaticParams() {
    try {
        const products = await getAllProducts("en", 100)
        const locales = ["en", "ar"]

        return locales.flatMap((locale) =>
            products.map((product) => ({
                locale,
                subCategory: product.subCategory.category.slug,
                sectionType: product.subCategory.slug,
                productId: product.productId,
            })),
        )
    } catch {
        return []
    }
}

export const dynamicParams = true

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

    return <ProductIdPage product={product} />
}
