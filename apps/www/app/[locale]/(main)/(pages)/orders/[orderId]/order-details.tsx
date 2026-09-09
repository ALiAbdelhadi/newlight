import { isZeroMoney } from "@repo/database"
import { ORDER_STATUS_COPY, PAYMENT_STATUS_COPY } from "@repo/database/status"
import type { Locale } from "@repo/database/locale"
import { ArrowLeft, Truck } from "lucide-react"

import { Container } from "@/components/layout/section"
import { OrderItemsList } from "@/components/order-items-list"
import { OrderProgress } from "@/components/order-progress"
import { OrderShippingInfo } from "@/components/order-shipping-info"
import { StatusBadge } from "@/components/status-badge"
import { Notice } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { formatNumberWithConversion } from "@/lib/price"
import { cn } from "@/lib/utils"
import type { OrderWithDetails } from "@/types"

interface OrderDetailsViewProps {
    order: OrderWithDetails
    locale: Locale
    translations: {
        orderDetails: string
        orderNumber: string
        orderDate: string
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
        free: string
    }
}

export function OrderDetailsView({ order, locale, translations: t }: OrderDetailsViewProps) {
    const statusCopy = ORDER_STATUS_COPY[order.status]
    const paymentCopy = PAYMENT_STATUS_COPY[order.paymentStatus]

    return (
        <div className="py-10 lg:py-16">
            <Container>
                <Button asChild variant="ghost" size="sm" className="-ms-3 mb-6">
                    <Link href="/orders">
                        <ArrowLeft className="size-4 rtl:rotate-180" />
                        {t.backToOrders}
                    </Link>
                </Button>

                <header className="flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-medium tracking-label text-muted-foreground uppercase">
                            {t.orderNumber}
                        </p>
                        <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight lg:text-4xl">
                            {order.orderNumber}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {t.orderDate}{" "}
                            <time dateTime={new Date(order.createdAt).toISOString()}>
                                {new Date(order.createdAt).toLocaleDateString(locale, {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </time>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge kind="order" value={order.status} locale={locale} size="md" />
                        <StatusBadge kind="payment" value={order.paymentStatus} locale={locale} size="md" />
                    </div>
                </header>

                <div className="mt-8 space-y-8">
                    <Notice tone={statusCopy.tone === "danger" ? "danger" : "info"} title={statusCopy.label[locale]}>
                        {statusCopy.description[locale]}{" "}
                        {order.paymentStatus === "PENDING" && paymentCopy.description[locale]}
                    </Notice>

                    <OrderProgress
                        status={order.status}
                        createdAt={order.createdAt}
                        shippedAt={order.shippedAt}
                        deliveredAt={order.deliveredAt}
                        locale={locale}
                    />

                    {order.trackingNumber && (
                        <div className="flex items-center gap-3 rounded-lg border bg-surface-sunk p-4">
                            <Truck aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">{t.trackingNumber}</p>
                                <p className="font-mono font-medium">{order.trackingNumber}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-8 lg:grid-cols-3">
                        <div className="space-y-8 lg:col-span-2">
                            <OrderItemsList
                                items={order.items}
                                locale={locale}
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
                                    locale={locale}
                                    translations={{
                                        shippingAddress: t.shippingAddress,
                                        shippingMethod: t.shippingMethod,
                                    }}
                                />
                            )}
                        </div>

                        <div className="lg:col-span-1">
                            <section
                                aria-labelledby="payment-summary"
                                className="rounded-lg border bg-card p-6 lg:sticky lg:top-24"
                            >
                                <h2 id="payment-summary" className="text-lg font-semibold tracking-tight">
                                    {t.paymentSummary}
                                </h2>

                                <dl className="mt-5 space-y-3 text-sm">
                                    <Row label={t.subtotal} value={formatNumberWithConversion(order.subtotal, locale)} />
                                    {order.tax && !isZeroMoney(order.tax) && (
                                        <Row label={t.tax} value={formatNumberWithConversion(order.tax, locale)} />
                                    )}
                                    <Row
                                        label={t.shipping}
                                        value={
                                            isZeroMoney(order.shippingCost)
                                                ? t.free
                                                : formatNumberWithConversion(order.shippingCost, locale)
                                        }
                                        muted={isZeroMoney(order.shippingCost)}
                                    />
                                </dl>

                                <div className="mt-5 flex items-baseline justify-between border-t pt-5">
                                    <dt className="font-medium">{t.total}</dt>
                                    <dd className="text-2xl font-semibold tabular-nums">
                                        {formatNumberWithConversion(order.total, locale)}
                                    </dd>
                                </div>

                                <p className="mt-4 text-sm text-muted-foreground">
                                    {paymentCopy.description[locale]}
                                </p>

                                <Button asChild variant="outline" className="mt-6 w-full">
                                    <Link href="/category">{t.continueShopping}</Link>
                                </Button>
                            </section>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn("tabular-nums", muted && "text-muted-foreground")}>{value}</dd>
        </div>
    )
}
