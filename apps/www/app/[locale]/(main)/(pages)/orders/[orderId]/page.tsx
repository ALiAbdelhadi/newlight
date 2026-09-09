import { getOrderDetails } from "@/actions/order"
import { constructMetadata } from "@/lib/metadata"
import { SupportedLanguage } from "@/types"
import { currentUserId } from "@/lib/auth"
import { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { resolveLocale } from "@repo/database"
import { notFound } from "next/navigation"
import { OrderDetailsView } from "./order-details"

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface OrderDetailsPageProps {
    params: Promise<{ orderId: string; locale: string }>
}

type MetadataProps = {
    params: Promise<{ orderId: string; locale: string }>
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    const { orderId, locale } = await params
    const currentLocale = locale as SupportedLanguage
    const tMetadata = await getTranslations("metadatas.orderDetails")

    const userId = await currentUserId()
    if (!userId) {
        notFound()
    }

    const order = await getOrderDetails(orderId)
    if (!order) {
        notFound()
    }

    const firstItem = order.items[0]
    const productImage = firstItem.productImage || undefined

    return constructMetadata({
        title: tMetadata("title", { orderNumber: order.orderNumber }),
        description: tMetadata("description", { orderNumber: order.orderNumber }),
        locale: currentLocale,
        image: productImage
    })
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
    const userId = await currentUserId()
    const { orderId, locale } = await params
    const currentLocale = await getLocale()
    const t = await getTranslations("orderDetails")

    if (!userId) {
        notFound()
    }

    const order = await getOrderDetails(orderId)
    if (!order) {
        notFound()
    }

    const translations = {
        orderDetails: t("orderDetails"),
        orderNumber: t("orderNumber"),
        orderDate: t("orderDate"),
        orderStatus: t("orderStatus"),
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
        tax: t("tax"),
        total: t("total"),
        trackingNumber: t("trackingNumber"),
        backToOrders: t("backToOrders"),
        continueShopping: t("continueShopping"),
        free: t("free"),
    }

    return (
        <OrderDetailsView
            order={order}
            locale={resolveLocale(currentLocale)}
            translations={translations}
        />
    )
}
