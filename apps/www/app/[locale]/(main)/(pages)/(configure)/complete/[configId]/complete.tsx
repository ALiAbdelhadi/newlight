"use client"

import { resolveLocale, serializeMoney } from "@repo/database"
import { Container } from "@/components/layout/section"
import { OrderActions } from "@/components/order-actions"
import { OrderItemsList } from "@/components/order-items-list"
import { OrderPaymentSummary } from "@/components/order-payment-summary"
import { OrderShippingInfo } from "@/components/order-shipping-info"
import { OrderProgress } from "@/components/order-progress"
import { OrderSuccessHeader } from "@/components/order-success-header"
import type { CompleteTranslations, OrderWithDetails } from "@/types"
import { useEffect } from "react"

interface CompletePageViewProps {
    order: OrderWithDetails
    locale: string
    translations: CompleteTranslations
}

export function CompletePageView({
    order,
    locale,
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
        <div className="min-h-screen py-24">
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
                    {/*
                      * The real ladder, driven by the order's own status. What stood here drew
                      * "Order placed → Processing" for every order forever — `processing` being
                      * a status migration 0010 removed from the enum, and "Estimated delivery"
                      * being a promise nothing in the system computes.
                      */}
                    <OrderProgress
                        status={order.status}
                        createdAt={order.createdAt}
                        shippedAt={order.shippedAt}
                        deliveredAt={order.deliveredAt}
                        locale={resolveLocale(locale)}
                        className="mb-8"
                    />
                    <div className="grid gap-8">
                        <OrderItemsList
                            items={order.items}
                            locale={resolveLocale(locale)}
                            translations={{
                                orderItems: t.orderItems,
                                colorTemp: t.colorTemp,
                                color: t.color,
                                quantity: t.quantity,
                            }}
                        />
                        {order.shippingAddress && (
                            <OrderShippingInfo
                                shippingAddress={order.shippingAddress}
                                shippingOption={order.shippingOption}
                                locale={resolveLocale(locale)}
                                translations={{
                                    shippingAddress: t.shippingAddress,
                                    shippingMethod: t.shippingMethod
                                }}
                            />
                        )}
                        <OrderPaymentSummary
                            subtotal={serializeMoney(order.subtotal)}
                            shippingCost={serializeMoney(order.shippingCost)}
                            total={serializeMoney(order.total)}
                            translations={{
                                paymentSummary: t.paymentSummary,
                                subtotal: t.subtotal,
                                shipping: t.shipping,
                                total: t.total,
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