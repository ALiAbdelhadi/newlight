"use client"

import Image from "@/components/app-image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    allowedTransitionsFrom,
    isZeroMoney,
    OrderStatus,
    type OrderOption,
    type PaymentMethod,
    type PaymentStatus,
    type SerializedMoney,
} from "@repo/database"

import { RecordLayout, type AuditEntry } from "@/components/record/record-layout"
import { MetadataList, Panel, Section } from "@/components/page"
import { ConfirmAction } from "@/components/confirm-action"
import { Money } from "@/components/money"
import { StatusBadge } from "@/components/status-badge"
import StatusDropdown from "@/components/status-dropdown-menu"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * One order, on the record archetype (P4.5 §12).
 *
 * The screen this replaces was five nested `Card`s, one of them with a solid blue masthead
 * carrying a 30px order number, and a progress bar labelled "Ordered · Processing · Fulfilled"
 * — three words of which two name statuses migration 0010 removed from the enum, so the middle
 * label described a state no order could be in and the last one described a state that no
 * longer exists. The real ladder is awaiting shipment → shipped → delivered, with cancelled off
 * to the side, and it is now rendered from the enum rather than from a hand-written switch
 * returning 33 / 66 / 100.
 *
 * Its "View Customer" link pointed at `/admin/dashboard/users/<id>`, which is not a route.
 */

export interface OrderRecordItem {
    id: string
    productId: string
    productName: string
    productImage: string | null
    price: SerializedMoney
    quantity: number
    colorTemp: string | null
    colorKey: string | null
}

export interface OrderRecordData {
    id: string
    orderNumber: string
    status: OrderStatus
    paymentStatus: PaymentStatus
    paymentMethod: PaymentMethod
    shippingOption: OrderOption
    subtotal: SerializedMoney
    tax: SerializedMoney | null
    shippingCost: SerializedMoney
    total: SerializedMoney
    trackingNumber: string | null
    paidAt: string | null
    shippedAt: string | null
    deliveredAt: string | null
    customerNotes: string | null
    adminNotes: string | null
    createdAt: string
    updatedAt: string
    customer: { id: string; name: string; email: string; phone: string | null }
    address: {
        fullName: string
        phone: string
        addressLine1: string
        addressLine2: string | null
        city: string
        state: string | null
        postalCode: string
        country: string
    } | null
    items: OrderRecordItem[]
}

/** The fulfilment ladder, from the enum. `cancelled` is not a step on it — it leaves it. */
const LADDER: { status: OrderStatus; label: string }[] = [
    { status: OrderStatus.awaiting_shipment, label: "Placed" },
    { status: OrderStatus.shipped, label: "Shipped" },
    { status: OrderStatus.delivered, label: "Delivered" },
]

export function OrderRecord({ order, audit }: { order: OrderRecordData; audit: AuditEntry[] }) {
    const router = useRouter()
    const [cancelling, setCancelling] = useState(false)

    const cancellable = allowedTransitionsFrom(order.status, "ADMIN").includes("cancelled")
    const units = order.items.reduce((sum, item) => sum + item.quantity, 0)

    async function cancelOrder() {
        setCancelling(true)
        try {
            const response = await fetch(`/api/orders/${order.id}/cancel`, { method: "PATCH" })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Failed to cancel order")
            toast.success("Order cancelled.")
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to cancel order")
        } finally {
            setCancelling(false)
        }
    }

    return (
        <RecordLayout
            title={`Order ${order.orderNumber}`}
            subtitle={`${order.items.length} line${order.items.length === 1 ? "" : "s"} · ${units} unit${units === 1 ? "" : "s"}`}
            status={{ kind: "order", value: order.status }}
            marks={<StatusBadge kind="payment" value={order.paymentStatus} />}
            identifiers={[
                { label: "Order", value: order.orderNumber },
                { label: "Method", value: `${order.paymentMethod} · ${order.shippingOption.replace("Shipping", "")}`, mono: false },
                ...(order.trackingNumber ? [{ label: "Tracking", value: order.trackingNumber }] : []),
            ]}
            actions={
                <>
                    <StatusDropdown id={order.id} orderStatus={order.status} compact />
                    {cancellable && (
                        <ConfirmAction
                            severity="consequential"
                            title={`Cancel order ${order.orderNumber}?`}
                            description="Cancelled is a terminal state — the order cannot be reopened, and a replacement has to be placed as a new one."
                            confirmLabel="Cancel order"
                            impact={{
                                affectedCount: order.items.length,
                                financialImpact: order.total,
                                sideEffects: [
                                    "Reserved stock is released back to available.",
                                    "The customer is notified that the order was cancelled.",
                                ],
                            }}
                            onConfirm={cancelOrder}
                        >
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={cancelling}
                                className="h-7 text-xs text-destructive hover:text-destructive"
                            >
                                {cancelling ? "Cancelling…" : "Cancel"}
                            </Button>
                        </ConfirmAction>
                    )}
                </>
            }
            rail={{
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                audit,
                auditHref: `/admin/audit?entity=Order&q=${order.id}`,
                extra: (
                    <div>
                        <h2 className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
                            Fulfilment
                        </h2>
                        <Ladder order={order} />
                    </div>
                ),
            }}
            tabs={[
                {
                    id: "summary",
                    label: "Summary",
                    content: (
                        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
                            <Section title="Lines" description="Names and prices are what was captured at checkout — a later rename does not rewrite them.">
                                <Panel padded={false} className="overflow-x-auto">
                                    <Table>
                                        <caption className="sr-only">Line items on this order</caption>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead scope="col">Product</TableHead>
                                                <TableHead scope="col">Options</TableHead>
                                                <TableHead scope="col" className="text-right">
                                                    Unit price
                                                </TableHead>
                                                <TableHead scope="col" className="text-right">
                                                    Qty
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            {item.productImage ? (
                                                                <Image
                                                                    src={item.productImage}
                                                                    alt=""
                                                                    width={24}
                                                                    height={24}
                                                                    className="size-6 shrink-0 rounded-sm border bg-card object-contain"
                                                                />
                                                            ) : (
                                                                <span
                                                                    aria-hidden
                                                                    className="grid size-6 shrink-0 place-items-center rounded-sm border border-dashed text-2xs text-muted-foreground"
                                                                >
                                                                    —
                                                                </span>
                                                            )}
                                                            <Link
                                                                href={`/admin/products/${item.productId}`}
                                                                className="min-w-0 truncate underline-offset-2 hover:underline"
                                                            >
                                                                <bdi dir="auto">{item.productName}</bdi>
                                                            </Link>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {[item.colorTemp, item.colorKey].filter(Boolean).join(" · ") || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Money value={item.price} />
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {item.quantity}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Panel>
                            </Section>

                            <div className="flex min-w-0 flex-col gap-5">
                                <Section title="Money">
                                    <Panel>
                                        <MetadataList
                                            items={[
                                                { label: "Subtotal", value: <Money value={order.subtotal} /> },
                                                ...(order.tax && !isZeroMoney(order.tax)
                                                    ? [{ label: "Tax", value: <Money value={order.tax} /> }]
                                                    : []),
                                                {
                                                    label: "Shipping",
                                                    value: isZeroMoney(order.shippingCost) ? (
                                                        <span className="text-muted-foreground">Free</span>
                                                    ) : (
                                                        <Money value={order.shippingCost} />
                                                    ),
                                                },
                                            ]}
                                        />
                                        <div className="mt-2 flex items-baseline justify-between gap-3 border-t pt-2">
                                            <span className="text-xs font-medium">Total</span>
                                            <Money value={order.total} className="text-base font-semibold" />
                                        </div>
                                        <p className="mt-2 text-2xs text-muted-foreground">
                                            {order.paidAt
                                                ? `Settled ${formatDateTime(order.paidAt)}.`
                                                : "Not settled — under cash on delivery, payment is recorded when the parcel is delivered."}
                                        </p>
                                    </Panel>
                                </Section>

                                <Section title="Customer">
                                    <Panel>
                                        <MetadataList
                                            items={[
                                                {
                                                    label: "Name",
                                                    value: (
                                                        <Link
                                                            href={`/admin/users/${order.customer.id}`}
                                                            className="underline-offset-2 hover:underline"
                                                        >
                                                            <bdi dir="auto">
                                                                {order.address?.fullName ||
                                                                    order.customer.name ||
                                                                    order.customer.email}
                                                            </bdi>
                                                        </Link>
                                                    ),
                                                },
                                                { label: "Email", value: order.customer.email },
                                                {
                                                    label: "Phone",
                                                    value: order.address?.phone ?? order.customer.phone ?? "—",
                                                    mono: true,
                                                },
                                            ]}
                                        />
                                    </Panel>
                                </Section>
                            </div>
                        </div>
                    ),
                },
                {
                    id: "shipping",
                    label: "Shipping",
                    content: (
                        <div className="grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
                            <Section title="Delivery address">
                                <Panel>
                                    {order.address ? (
                                        <MetadataList
                                            items={[
                                                { label: "Recipient", value: <bdi dir="auto">{order.address.fullName}</bdi> },
                                                { label: "Phone", value: order.address.phone, mono: true },
                                                {
                                                    label: "Street",
                                                    value: (
                                                        <bdi dir="auto">
                                                            {[order.address.addressLine1, order.address.addressLine2]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </bdi>
                                                    ),
                                                },
                                                {
                                                    label: "City",
                                                    value: (
                                                        <bdi dir="auto">
                                                            {[order.address.city, order.address.state]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </bdi>
                                                    ),
                                                },
                                                { label: "Postal code", value: order.address.postalCode, mono: true },
                                                { label: "Country", value: order.address.country },
                                            ]}
                                        />
                                    ) : (
                                        <p className="text-xs text-danger">
                                            This order has no shipping address. It cannot be dispatched until one is
                                            captured — the customer has to add it from the storefront.
                                        </p>
                                    )}
                                </Panel>
                            </Section>

                            <Section title="Movement">
                                <Panel>
                                    <MetadataList
                                        items={[
                                            { label: "Placed", value: formatDateTime(order.createdAt) },
                                            {
                                                label: "Shipped",
                                                value: order.shippedAt ? formatDateTime(order.shippedAt) : "—",
                                            },
                                            {
                                                label: "Delivered",
                                                value: order.deliveredAt ? formatDateTime(order.deliveredAt) : "—",
                                            },
                                            {
                                                label: "Tracking",
                                                value:
                                                    order.trackingNumber ??
                                                    (order.status === OrderStatus.shipped ? (
                                                        <span className="text-warning">Not recorded</span>
                                                    ) : (
                                                        "—"
                                                    )),
                                                mono: !!order.trackingNumber,
                                            },
                                            { label: "Method", value: order.shippingOption.replace("Shipping", "") },
                                        ]}
                                    />
                                </Panel>
                            </Section>
                        </div>
                    ),
                },
                {
                    id: "notes",
                    label: "Notes",
                    badge:
                        order.customerNotes || order.adminNotes ? (
                            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                        ) : undefined,
                    content: (
                        <div className="grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
                            <Section
                                title="From the customer"
                                description="Entered at checkout. Read-only — it is what they wrote."
                            >
                                <Panel>
                                    {order.customerNotes ? (
                                        <p className="text-sm whitespace-pre-wrap">
                                            <bdi dir="auto">{order.customerNotes}</bdi>
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">They left no note.</p>
                                    )}
                                </Panel>
                            </Section>

                            <Section title="Internal" description="Never shown to the customer.">
                                <Panel>
                                    {order.adminNotes ? (
                                        <p className="text-sm whitespace-pre-wrap">
                                            <bdi dir="auto">{order.adminNotes}</bdi>
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            Nothing recorded against this order.
                                        </p>
                                    )}
                                </Panel>
                            </Section>
                        </div>
                    ),
                },
            ]}
        />
    )
}

/**
 * The fulfilment ladder as a list of steps, not a percentage bar.
 *
 * A bar has to answer "how far along, out of what", and for a cancelled order there is no
 * honest number — the old one returned 0, which reads as "not started". Three labelled steps
 * with a reached/not-reached mark say what actually happened, and cancellation is stated rather
 * than encoded as an empty bar.
 */
function Ladder({ order }: { order: OrderRecordData }) {
    if (order.status === OrderStatus.cancelled) {
        return (
            <p className="mt-1.5 text-2xs text-danger">
                Cancelled. The order left the ladder and cannot re-enter it.
            </p>
        )
    }

    const reachedIndex = LADDER.findIndex((step) => step.status === order.status)
    const timestamps: Record<OrderStatus, string | null> = {
        awaiting_shipment: order.createdAt,
        shipped: order.shippedAt,
        delivered: order.deliveredAt,
        cancelled: null,
    }

    return (
        <ol className="mt-1.5 space-y-1.5">
            {LADDER.map((step, index) => {
                const reached = index <= reachedIndex
                const at = timestamps[step.status]
                return (
                    <li key={step.status} className="flex items-baseline gap-2 text-2xs">
                        <span
                            aria-hidden
                            className={
                                reached
                                    ? "size-1.5 shrink-0 rounded-full bg-primary"
                                    : "size-1.5 shrink-0 rounded-full border border-border-strong"
                            }
                        />
                        <span className={reached ? "font-medium" : "text-muted-foreground"}>{step.label}</span>
                        <span className="ml-auto tabular-nums text-muted-foreground">
                            {reached && at ? formatDate(at) : ""}
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}
