import { serializeMoney } from "@repo/database"
import { getConfiguration } from "@/actions/configuration"
import { getProductWithDetails } from "@/actions/order"
import { constructMetadata } from "@/lib/metadata"
import { createPageCanonicalUrl } from "@/lib/canonical-url"
import { SupportedLanguage } from "@/types"
import { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { PreviewClient } from "./preview"

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PreviewPageProps {
    params: Promise<{ configId: string }>
}

type MetadataProps = {
    params: Promise<{ configId: string }>
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    const { configId } = await params
    const locale = await getLocale() as SupportedLanguage
    const t = await getTranslations("metadatas.preview")

    const configuration = await getConfiguration(configId)
    if (!configuration) {
        return constructMetadata({
            title: t("defaultTitle"),
            description: t("defaultDescription"),
            locale: locale as SupportedLanguage,
            canonicalUrl: createPageCanonicalUrl({ locale, path: `preview/${configId}` }),
            noIndex: true,
        })
    }

    const product = await getProductWithDetails(configuration.productSku, locale)
    if (!product) {
        return constructMetadata({
            title: t("defaultTitle"),
            description: t("defaultDescription"),
            locale: locale as SupportedLanguage,
            canonicalUrl: createPageCanonicalUrl({ locale, path: `preview/${configId}` }),
            noIndex: true,
        })
    }

    const productTranslation = product.translations?.[0]
    const categoryTranslation = product.subCategory?.category?.translations?.[0]

    const productName = productTranslation?.name || product.productId
    const categoryName = categoryTranslation?.name ?? ""

    const configDetails = [
        configuration.selectedColorTemp,
        configuration.selectedColorKey,
        `${configuration.quantity} ${locale === "ar" ? "قطعة" : "units"}`
    ].filter(Boolean).join(", ")

    const productImage = product.images[0]?.url

    return constructMetadata({
        title: t("title", {
            name: productName,
            category: categoryName
        }),
        description: t("description", {
            name: productName,
            config: configDetails,
            price: configuration.totalPrice.toLocaleString()
        }),
        locale: locale as SupportedLanguage,
        canonicalUrl: createPageCanonicalUrl({ locale, path: `preview/${configId}` }),
        // A one-time cart/checkout step behind an unguessable id — robots.txt already
        // disallows the whole /preview/ tree; this is belt-and-suspenders for any crawler
        // that reaches it through a link anyway.
        noIndex: true,
        image: productImage
    })
}

export default async function PreviewPage({ params }: PreviewPageProps) {
    const locale = await getLocale()
    const t = await getTranslations("preview")
    const { configId } = await params

    const configuration = await getConfiguration(configId)
    if (!configuration) {
        notFound()
    }

    const product = await getProductWithDetails(configuration.productSku, locale)
    if (!product) {
        notFound()
    }

    const translations = {
        home: t("home"),
        orderPreview: t("orderPreview"),
        reviewOrder: t("reviewOrder"),
        reviewDescription: t("reviewDescription"),
        noImage: t("noImage"),
        keySpecs: t("keySpecs"),
        orderSummary: t("orderSummary"),
        colorTemperature: t("colorTemperature"),
        surfaceColor: t("surfaceColor"),
        quantity: t("quantity"),
        unitPrice: t("unitPrice"),
        subtotal: t("subtotal"),
        discount: t("discount"),
        total: t("total"),
        currency: t("currency"),
        proceedToCheckout: t("proceedToCheckout"),
        processing: t("processing"),
        secureCheckout: t("secureCheckout"),
    }

    return (
        <PreviewClient
            configId={configId}
            product={product}
            configuration={{
                quantity: configuration.quantity,
                totalPrice: serializeMoney(configuration.totalPrice),
                selectedColorTemp: configuration.selectedColorTemp,
                selectedColorKey: configuration.selectedColorKey,
            }}
            translations={translations}
            locale={locale}
        />
    )
}