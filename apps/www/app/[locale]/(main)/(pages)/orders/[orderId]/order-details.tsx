"use client"

import { Container } from "@/components/container"
import { OrderItemsList } from "@/components/order-items-list"
import { OrderShippingInfo } from "@/components/order-shipping-info"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Link } from "@/i18n/navigation"
import { formatNumberWithConversion } from "@/lib/price"
import type { OrderWithDetails } from "@/types"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { ArrowLeft, Calendar, CreditCard, FileText, Package, Truck } from "lucide-react"
import { useMemo } from "react"

interface OrderDetailsViewProps {
    order: OrderWithDetails
    locale: string
    isArabic: boolean
    translations: {
        orderDetails: string
        orderNumber: string
        orderDate: string
        orderStatus: string
        orderItems: string
        colorTemp: string
        color: string
        quantity: string
        each: string
        currency: string
        shippingAddress: string
        shippingMethod: string
        paymentSummary: string
        subtotal: string
        shipping: string
        tax: string
        total: string
        trackingNumber: string
        backToOrders: string
        continueShopping: string
    }
}

export function OrderDetailsView({
    order,
    locale,
    isArabic,
    translations: t
}: OrderDetailsViewProps) {
    const orderStatusLabel = useMemo(() => {
        const statusMap: Record<string, { en: string; ar: string }> = {
            awaiting_shipment: { en: "Awaiting Shipment", ar: "في انتظار الشحن" },
            processing: { en: "Processing", ar: "قيد المعالجة" },
            shipped: { en: "Shipped", ar: "تم الشحن" },
            delivered: { en: "Delivered", ar: "تم التسليم" },
            fulfilled: { en: "Fulfilled", ar: "مكتمل" },
            cancelled: { en: "Cancelled", ar: "ملغي" },
            refunded: { en: "Refunded", ar: "مسترد" },
        }
        const status = statusMap[order.status] || { en: order.status, ar: order.status }
        return isArabic ? status.ar : status.en
    }, [order.status, isArabic])

    const getStatusColor = (status: string) => {
        switch (status) {
            case "fulfilled":
            case "delivered":
                return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            case "shipped":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
            case "processing":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
            case "cancelled":
            case "refunded":
                return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
        }
    }

    return (
        <div className="min-h-screen bg-background py-12 md:py-24">
            <Container>
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <Link href="/">
                            <Button variant="ghost" className="mb-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t.backToOrders}
                            </Button>
                        </Link>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-serif font-light tracking-tight mb-2">
                                    {t.orderDetails}
                                </h1>
                                <p className="text-muted-foreground">
                                    {t.orderNumber}: <span className="font-mono font-medium text-foreground">{order.orderNumber}</span>
                                </p>
                            </div>
                            <Badge className={`${getStatusColor(order.status)} text-sm px-4 py-2`}>
                                {orderStatusLabel}
                            </Badge>
                        </div>
                    </div>
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                {t.orderDetails}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t.orderDate}</p>
                                        <p className="font-medium">
                                            {format(new Date(order.createdAt), "PPP", { locale: isArabic ? ar : enUS })}
                                        </p>
                                    </div>
                                </div>
                                {order.trackingNumber && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                            <Truck className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t.trackingNumber}</p>
                                            <p className="font-medium font-mono">{order.trackingNumber}</p>
                                        </div>
                                    </div>
                                )}
                                {order.shippedAt && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                            <Package className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Shipped Date</p>
                                            <p className="font-medium">
                                                {format(new Date(order.shippedAt), "PPP", { locale: isArabic ? ar : enUS })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    <div className="grid gap-8 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-8">
                            <OrderItemsList
                                items={order.items}
                                isArabic={isArabic}
                                translations={{
                                    orderItems: t.orderItems,
                                    colorTemp: t.colorTemp,
                                    color: t.color,
                                    quantity: t.quantity,
                                    each: t.each,
                                    currency: t.currency
                                }}
                            />
                            {order.shippingAddress && (
                                <OrderShippingInfo
                                    shippingAddress={order.shippingAddress}
                                    shippingOption={order.shippingOption}
                                    isArabic={isArabic}
                                    translations={{
                                        shippingAddress: t.shippingAddress,
                                        shippingMethod: t.shippingMethod
                                    }}
                                />
                            )}
                        </div>
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        {t.paymentSummary}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t.subtotal}</span>
                                        <span className="font-medium">{formatNumberWithConversion(order.subtotal, locale)}</span>
                                    </div>
                                    {order.tax && order.tax > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t.tax}</span>
                                            <span className="font-medium">{formatNumberWithConversion(order.tax, locale)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t.shipping}</span>
                                        <span className="font-medium">
                                            {order.shippingCost > 0 ? formatNumberWithConversion(order.shippingCost, locale) : (isArabic ? "مجاني" : "Free")}
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-baseline pt-2">
                                        <span className="text-lg font-semibold uppercase tracking-wide">{t.total}</span>
                                        <span className="text-2xl font-serif font-light">
                                            {formatNumberWithConversion(order.total, locale)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="mt-6 flex flex-col gap-3">
                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/">
                                        {t.continueShopping}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}

