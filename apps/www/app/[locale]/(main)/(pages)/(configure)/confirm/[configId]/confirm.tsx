"use client"

import { ConfirmForm } from "@/components/confirm-form"
import { Container } from "@/components/container"
import { OrderSummary } from "@/components/order-summary"
import { ConfirmPageViewProps } from "@/types"

export function ConfirmPageView({
    configId,
    userId,
    configuration,
    product,
    productName,
    existingAddress,
    translations: t,
    isArabic
}: ConfirmPageViewProps) {
    return (
        <div className="min-h-screen bg-background py-24">
            <Container>
                <div className="max-w-6xl mx-auto">
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
                            {t.confirmYourOrder}
                        </h1>
                        <p className="text-muted-foreground">
                            {t.confirmDescription}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">
                        <div className="lg:col-span-2">
                            <OrderSummary
                                product={product}
                                productName={productName}
                                configuration={configuration}
                                translations={{
                                    orderSummary: t.orderSummary,
                                    quantity: t.quantity,
                                    subtotal: t.subtotal,
                                    shipping: t.shipping,
                                    calculatedAtCheckout: t.calculatedAtCheckout,
                                    currency: t.currency
                                }}
                            />
                        </div>
                        <div className="lg:col-span-3">
                            <ConfirmForm
                                configId={configId}
                                userId={userId}
                                existingAddress={existingAddress}
                                translations={{
                                    shippingInformation: t.shippingInformation,
                                    fullName: t.fullName,
                                    phone: t.phone,
                                    email: t.email,
                                    addressLine1: t.addressLine1,
                                    addressLine2: t.addressLine2,
                                    city: t.city,
                                    state: t.state,
                                    postalCode: t.postalCode,
                                    shippingOption: t.shippingOption,
                                    basicShipping: t.basicShipping,
                                    standardShipping: t.standardShipping,
                                    expressShipping: t.expressShipping,
                                    saveAndContinue: t.saveAndContinue,
                                    fullNamePlaceholder: t.fullNamePlaceholder,
                                    phonePlaceholder: t.phonePlaceholder,
                                    emailPlaceholder: t.emailPlaceholder,
                                    addressPlaceholder: t.addressPlaceholder,
                                    cityPlaceholder: t.cityPlaceholder,
                                    statePlaceholder: t.statePlaceholder,
                                    postalCodePlaceholder: t.postalCodePlaceholder
                                }}
                                isArabic={isArabic}
                            />
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}