import { getOrderDetails } from "@/actions/order"
import { auth } from "@clerk/nextjs/server"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { CompletePageView } from "./complete"
import { constructMetadata } from "@/lib/metadata"
import { SupportedLanguage } from "@/types"
import { Metadata } from "next"

interface CompletePageProps {
    searchParams: Promise<{ orderId?: string }>
}

type MetadataProps = {
    searchParams: Promise<{ orderId?: string }>
}

export async function generateMetadata({ searchParams }: MetadataProps): Promise<Metadata> {
    const { orderId } = await searchParams
    const locale = await getLocale() as SupportedLanguage
    const t = await getTranslations("metadatas.complete")

    if (!orderId) {
        notFound()
    }

    const order = await getOrderDetails(orderId)
    if (!order) {
        notFound()
    }
    const firstItem = order.items[0]
    const productImage = firstItem.productImage || undefined

    return constructMetadata({
        title: t("title", { orderNumber: order.orderNumber }),
        description: t("description", { orderNumber: order.orderNumber }),
        locale: locale as SupportedLanguage,
        image: productImage
    })
}

export default async function CompletePage({ searchParams }: CompletePageProps) {
    const { userId } = await auth()
    const locale = await getLocale()
    const t = await getTranslations("complete")
    const { orderId } = await searchParams

    if (!userId) {
        notFound()
    }

    if (!orderId) {
        notFound()
    }

    const order = await getOrderDetails(orderId)
    if (!order) {
        notFound()
    }

    const isArabic = locale.startsWith("ar")

    const translations = {
        orderConfirmed: t("orderConfirmed"),
        thankYou: t("thankYou"),
        orderNumber: t("orderNumber"),
        orderPlaced: t("orderPlaced"),
        processing: t("processing"),
        estimatedDelivery: t("estimatedDelivery"),
        orderItems: t("orderItems"),
        colorTemp: t("colorTemp"),
        color: t("color"),
        quantity: t("quantity"),
        each: t("each"),
        currency: t("currency"),
        shippingAddress: t("shippingAddress"),
        shippingMethod: t("shippingMethod"),
        paymentSummary: t("paymentSummary"),
        subtotal: t("subtotal"),
        shipping: t("shipping"),
        total: t("total"),
        viewOrderDetails: t("viewOrderDetails"),
        continueShopping: t("continueShopping"),
    }

    return (
        <CompletePageView
            order={order}
            locale={locale}
            isArabic={isArabic}
            translations={translations}
        />
    )
}
