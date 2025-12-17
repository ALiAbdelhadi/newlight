import { getAllProducts, getProductById } from "@/lib/db"
import { constructMetadata } from "@/lib/metadata"
import { SupportedLanguage } from "@/types"
import { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import ProductIdPage from "./product-id"

export const revalidate = 3600
export const dynamic = "force-dynamic"
export const dynamicParams = true

type Props = {
    params: Promise<{
        subCategory: string
        sectionType: string
        productId: string
        locale: string
    }>
}

type MetadataProps = {
    params: Promise<{
        productId: string
    }>
}

function buildSpecsDescription(
    specs: Record<string, string | number | string[]> | null | undefined,
    locale: string
) {
    if (!specs) return ""

    const isArabic = locale.startsWith("ar")

    const priorityKeys = [
        "voltage",
        "maximum_wattage",
        "maxWattage",
        "luminous_flux",
        "beam_angle",
        "ip_rating",
        "main_material",
        "life_time",
        "color_temperature",
    ]

    const readable = (key: string, value: any) => {
        if (Array.isArray(value)) return value.join(" / ")
        return value.toString()
    }

    const selected = Object.entries(specs)
        .filter(([key]) =>
            priorityKeys.some(p => key.toLowerCase().includes(p.toLowerCase()))
        )
        .slice(0, 6)
        .map(([key, value]) => readable(key, value))

    return selected.join(isArabic ? "، " : ", ")
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    // ✅ await params first
    const { productId } = await params

    const locale = await getLocale() as SupportedLanguage
    const t = await getTranslations("metadatas.product-page")

    const product = await getProductById(productId, locale)

    if (!product) {
        notFound()
    }

    const productTranslation = product.translations[0]
    const subCategoryTranslation = product.subCategory?.translations[0]
    const categoryTranslation = product.subCategory?.category?.translations[0]

    const productName = productTranslation?.name || product.productId
    const subCategoryName = subCategoryTranslation?.name || product.subCategory?.slug || ""
    const categoryName = categoryTranslation?.name || product.subCategory?.category?.categoryType || ""

    const specsText = buildSpecsDescription(product.specifications, locale)

    const productImage = product.images?.[0] || undefined

    const productKeywords = [
        productName,
        product.productId,
        subCategoryName,
        categoryName,
        ...(product.colorTemperatures || []),
        ...(product.availableColors || []),
        product.brandOfLed,
        product.mainMaterial,
    ].filter(Boolean).join(", ")

    return constructMetadata({
        title: t("title", {
            name: productName,
            id: product.productId,
            category: categoryName,
        }),
        description: t("description", {
            name: productName,
            id: product.productId,
            category: categoryName,
            specs: specsText || (locale === "ar"
                ? "مواصفات احترافية عالية الجودة"
                : "professional-grade specifications"),
        }),
        locale: locale as SupportedLanguage,
        image: productImage,
        keywords: productKeywords,
    })
}

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

export default async function CategoryProductIdPage({ params }: Props) {
    const { productId } = await params
    const currentLocale = await getLocale()

    const product = await getProductById(productId, currentLocale)

    if (!product) {
        notFound()
    }

    const productWithCorrectSpecs = {
        ...product,
        specifications: product.specifications as Record<string, string | number | string[]> | null | undefined
    }

    return <ProductIdPage product={productWithCorrectSpecs} />
}