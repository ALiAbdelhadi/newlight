"use client"

import { Container } from "@/components/container"
import { OrderActions } from "@/components/order-actions"
import { OrderItemsList } from "@/components/order-items-list"
import { OrderPaymentSummary } from "@/components/order-payment-summary"
import { OrderShippingInfo } from "@/components/order-shipping-info"
import { OrderStatusTimeline } from "@/components/order-status-timeline"
import { OrderSuccessHeader } from "@/components/order-success-header"
import type { CompleteTranslations, OrderWithDetails } from "@/types"
import { useEffect } from "react"

interface CompletePageViewProps {
    order: OrderWithDetails
    locale: string
    isArabic: boolean
    translations: CompleteTranslations
}

export function CompletePageView({
    order,
    locale,
    isArabic,
    translations: t
}: CompletePageViewProps) {
    useEffect(() => {

        if (typeof window !== 'undefined') {
            const currentUrl = window.location.href
            const homeUrl = `${window.location.origin}/${locale}`

            window.history.replaceState(null, '', currentUrl)

            const handlePopState = () => {
                window.location.href = homeUrl
            }

            window.history.pushState(null, '', currentUrl)

            window.addEventListener('popstate', handlePopState)

            return () => {
                window.removeEventListener('popstate', handlePopState)
            }
        }
    }, [locale])

    return (
        <div className="min-h-screen bg-background py-24">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <OrderSuccessHeader
                        orderNumber={order.orderNumber}
                        translations={{
                            orderConfirmed: t.orderConfirmed,
                            thankYou: t.thankYou,
                            orderNumber: t.orderNumber
                        }}
                    />
                    <OrderStatusTimeline
                        createdAt={order.createdAt}
                        locale={locale}
                        translations={{
                            orderPlaced: t.orderPlaced,
                            processing: t.processing,
                            estimatedDelivery: t.estimatedDelivery
                        }}
                    />
                    <div className="grid gap-8">
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
                        <OrderPaymentSummary
                            subtotal={order.subtotal}
                            shippingCost={order.shippingCost}
                            total={order.total}
                            translations={{
                                paymentSummary: t.paymentSummary,
                                subtotal: t.subtotal,
                                shipping: t.shipping,
                                total: t.total,
                                currency: t.currency
                            }}
                        />
                        <OrderActions
                            orderId={order.id}
                            translations={{
                                viewOrderDetails: t.viewOrderDetails,
                                continueShopping: t.continueShopping,
                            }}
                        />
                    </div>
                </div>
            </Container>
        </div>
    )
}