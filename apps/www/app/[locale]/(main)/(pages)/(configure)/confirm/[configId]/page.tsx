import { getConfiguration } from "@/actions/configuration"
import { getProductWithDetails, getUserShippingAddress } from "@/actions/order"
import { constructMetadata } from "@/lib/metadata"
import { SupportedLanguage } from "@/types"
import { auth } from "@clerk/nextjs/server"
import { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, redirect } from "next/navigation"
import { ConfirmPageView } from "./confirm"


export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ConfirmPageProps {
    params: Promise<{ configId: string }>
}

type MetadataProps = {
    params: Promise<{ configId: string }>
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    const { configId } = await params
    const locale = await getLocale() as SupportedLanguage
    const t = await getTranslations("metadatas.confirm")

    const configuration = await getConfiguration(configId)
    if (!configuration) {
        return constructMetadata({
            title: t("defaultTitle"),
            description: t("defaultDescription"),
            locale: locale as SupportedLanguage,
        })
    }

    const product = await getProductWithDetails(configuration.productId, locale)
    if (!product) {
        notFound()
    }

    const productImage = product.images?.[0] || undefined
    const productTranslation = product.translations[0]
    const productName = productTranslation?.name || product.productId

    return constructMetadata({
        title: t("title", { product: productName }),
        description: t("description", { product: productName }),
        image: productImage,
        locale: locale as SupportedLanguage,
    })
}

export default async function ConfirmPage({ params }: ConfirmPageProps) {
    const { userId } = await auth()
    const locale = await getLocale()
    const t = await getTranslations("confirm")
    const { configId } = await params

    if (!userId) {
        redirect(`/${locale}/preview/${configId}`)
    }

    const [configuration, existingAddress] = await Promise.all([
        getConfiguration(configId),
        getUserShippingAddress(userId)
    ])

    if (!configuration) {
        notFound()
    }

    const product = await getProductWithDetails(configuration.productId, locale)
    if (!product) {
        notFound()
    }

    const formattedAddress = existingAddress ? {
        ...existingAddress,
        email: existingAddress.email ?? undefined,
        addressLine2: existingAddress.addressLine2 ?? undefined,
        state: existingAddress.state ?? undefined,
    } : undefined

    const translations = {
        home: t("home"),
        orderPreview: t("orderPreview"),
        confirmOrder: t("confirmOrder"),
        confirmYourOrder: t("confirmYourOrder"),
        confirmDescription: t("confirmDescription"),
        orderSummary: t("orderSummary"),
        quantity: t("quantity"),
        subtotal: t("subtotal"),
        shipping: t("shipping"),
        calculatedAtCheckout: t("calculatedAtCheckout"),
        currency: t("currency"),
        shippingInformation: t("shippingInformation"),
        fullName: t("fullName"),
        phone: t("phone"),
        email: t("email"),
        addressLine1: t("addressLine1"),
        addressLine2: t("addressLine2"),
        city: t("city"),
        state: t("state"),
        postalCode: t("postalCode"),
        shippingOption: t("shippingOption"),
        basicShipping: t("basicShipping"),
        standardShipping: t("standardShipping"),
        expressShipping: t("expressShipping"),
        saveAndContinue: t("saveAndContinue"),
        fullNamePlaceholder: t("fullNamePlaceholder"),
        phonePlaceholder: t("phonePlaceholder"),
        emailPlaceholder: t("emailPlaceholder"),
        addressPlaceholder: t("addressPlaceholder"),
        cityPlaceholder: t("cityPlaceholder"),
        statePlaceholder: t("statePlaceholder"),
        postalCodePlaceholder: t("postalCodePlaceholder"),
    }

    const isArabic = locale.startsWith("ar")
    const productTranslation = product.translations[0]
    const productName = productTranslation?.name || product.productId

    return (
        <ConfirmPageView
            configId={configId}
            userId={userId}
            configuration={configuration}
            product={product}
            productName={productName}
            existingAddress={formattedAddress}  // ✅ استخدم البيانات المحولة
            translations={translations}
            isArabic={isArabic}
        />
    )
}