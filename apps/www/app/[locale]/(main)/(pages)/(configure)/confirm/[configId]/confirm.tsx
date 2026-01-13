"use client"

import { ConfirmForm } from "@/components/confirm-form"
import { Container } from "@/components/container"
import { OrderSummary } from "@/components/order-summary"
import { ConfirmPageViewProps } from "@/types"
import { motion } from "framer-motion"
import { ShoppingBag, MapPin, CheckCircle, Check } from "lucide-react"

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
        <div className="min-h-screen bg-background py-12 md:py-24">
            <Container>
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-8 md:mb-12"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light tracking-tight">
                                    {t.confirmYourOrder}
                                </h1>
                            </div>
                        </div>
                        <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                            {t.confirmDescription}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mb-8 md:mb-12"
                    >
                        <div className="flex items-center justify-center gap-2 md:gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shadow-lg">
                                    <span className="text-base"><Check className="w-4 h-4" /></span>
                                </div>
                                <span className="text-sm font-medium hidden sm:inline">
                                    {isArabic ? "نظره علي المنتج" : "Preview"}
                                </span>
                            </div>
                            <div className="w-12 md:w-24 h-0.5 bg-primary" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shadow-lg ring-4 ring-primary/20">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium hidden sm:inline text-primary">
                                    {isArabic ? "الشحن" : "Shipping"}
                                </span>
                            </div>
                            <div className="w-12 md:w-24 h-0.5 bg-muted" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                                    {isArabic ? "إكمال الطلب" : "Complete"}
                                </span>
                            </div>
                        </div>
                        <div className="text-center mt-4">
                            <p className="text-xs text-muted-foreground">
                                {isArabic
                                    ? "الدفع عند الاستلام - أدخل معلومات الشحن لإكمال طلبك"
                                    : "Cash on Delivery - Enter shipping details to complete your order"
                                }
                            </p>
                        </div>
                    </motion.div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 xl:gap-20">
                        <motion.div
                            initial={{ opacity: 0, x: isArabic ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="lg:col-span-2 order-2 lg:order-1"
                        >
                            <div className="lg:sticky lg:top-24">
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
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: isArabic ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="lg:col-span-3 order-1 lg:order-2"
                        >
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
                        </motion.div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="mt-12"
                    >
                        <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                                        {isArabic ? "الدفع عند الاستلام" : "Cash on Delivery"}
                                    </h3>
                                    <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                                        {isArabic
                                            ? "ادفع عندما تستلم طلبك - لا حاجة لبطاقة ائتمان أو دفع مسبق. نقبل النقد فقط عند التسليم."
                                            : "Pay when you receive your order - no credit card or advance payment needed. We accept cash only upon delivery."
                                        }
                                    </p>
                                    <div className="flex flex-wrap gap-3 text-xs">
                                        <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>{isArabic ? "آمن ومضمون" : "Safe & Secure"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>{isArabic ? "لا رسوم إضافية" : "No Extra Fees"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>{isArabic ? "فحص المنتج قبل الدفع" : "Inspect Before Payment"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="mt-8 text-center"
                    >
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>
                                {isArabic
                                    ? "معلوماتك محمية بتشفير SSL"
                                    : "Your information is protected with SSL encryption"
                                }
                            </span>
                        </div>
                    </motion.div>
                </div>
            </Container>
        </div>
    )
}