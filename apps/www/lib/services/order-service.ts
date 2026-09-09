/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    addMoney,
    DEFAULT_LOCATION_ID,
    encodeSlug,
    getShippingRates,
    Prisma,
    prisma,
    multiplyMoney,
    release,
    reserve,
    resolveEffectivePrice,
    resolveLocale,
    serializeMoney,
} from "@repo/database"
import type { Locale } from "@repo/database"
import { activeDiscounts } from "@/lib/discounts"
import { queueMail } from "@repo/mail/outbox"
import { adminRecipients, dispatchPushSoon, notifyRecipients } from "@repo/notifications"

type CreateOrderResult =
    | {
        success: true
        orderId: string
        orderNumber: string
        isDuplicate: boolean
    }
    | {
        success: false
        error: string
    }

type CancelOrderResult =
    | {
        success: true
        order?: any
    }
    | {
        success: false
        error: string
    }

export class OrderService {
    /**
     * Create order with full transactional safety
     */
    static async createOrder(params: {
        userId: string
        configurationId: string
        shippingAddressId: string
        shippingOption: "BasicShipping" | "StandardShipping" | "ExpressShipping"
        idempotencyKey: string
    }): Promise<CreateOrderResult> {
        const { userId, configurationId, shippingAddressId, shippingOption, idempotencyKey } =
            params

        try {
            // Idempotency check
            const existingOrder = await this.findOrderByIdempotencyKey(userId, idempotencyKey)
            if (existingOrder) {
                return {
                    success: true,
                    orderId: existingOrder.id,
                    orderNumber: existingOrder.orderNumber,
                    isDuplicate: true,
                }
            }

            /*
             * Resolved BEFORE the transaction opens, and this is not a micro-optimisation.
             *
             * The transaction below is SERIALIZABLE, and the administrator lookup is a Seq
             * Scan on `users` — the planner ignores `@@index([role])` because the table is
             * small. Postgres locks a sequential scan under SSI at RELATION granularity, so
             * running it inside held a predicate lock on the WHOLE `users` table for the
             * duration of every checkout. Measured, not assumed: with a concurrent
             * transaction that reads `notifications` and writes `users` the cycle closes and
             * one of the pair dies — in the run it was the SIGN-UP that died, not the order.
             *
             * Out here it takes no predicate lock at all. The trade is that an administrator
             * created in the milliseconds before the commit misses this one notification.
             */
            const recipients = await adminRecipients(prisma)

            // Transactional creation
            const result = await prisma.$transaction(
                async (tx) => {
                    const config = await tx.productConfiguration.findUnique({
                        where: { id: configurationId },
                    })

                    if (!config) {
                        throw new Error("Configuration not found")
                    }

                    // config.productId is a real foreign key now (A17): in v1 it held a SKU
                    // and resolved to zero product rows.
                    const product = await tx.product.findUnique({
                        where: { id: config.productId },
                        include: {
                            translations: { where: { locale: resolveLocale(undefined) }, take: 1 },
                            images: { orderBy: { order: "asc" }, take: 1 },
                        },
                    })

                    if (!product) {
                        throw new Error("Product not found")
                    }

                    // Availability is onHand - reserved, from the ledger's derived level
                    // (§13.4) — not a mutable integer on the product row.
                    const level = await tx.stockLevel.findUnique({
                        where: { productId_locationId: { productId: product.id, locationId: DEFAULT_LOCATION_ID } },
                        select: { onHand: true, reserved: true },
                    })
                    if (Math.max(0, (level?.onHand ?? 0) - (level?.reserved ?? 0)) < config.quantity) {
                        throw new Error("Insufficient inventory")
                    }

                    // Decimal arithmetic through the money boundary. `subtotal + shippingCost`
                    // silently coerced a Decimal to a JS number, which is the exact defect
                    // migration 0001 exists to remove (ADR 0001).
                    //
                    // The rates were a literal here, which made the admin panel's Shipping
                    // screen unable to change them and a deploy the only way to reprice
                    // delivery. They are settings now; the defaults are these same numbers,
                    // so a database with no rows behaves identically.
                    const shippingRates = await getShippingRates(tx)
                    const shippingCost = shippingRates[shippingOption]

                    /*
                     * The price is resolved HERE, at the moment the order is created, not read
                     * off the configuration (§13.2).
                     *
                     * A configuration is re-priced whenever it is read, so the two agree on
                     * every normal path — but "whenever it is read" is not "at the instant it
                     * is bought", and a discount that expires while the confirmation page is
                     * open would otherwise be honoured by a stored number nobody re-checked.
                     * What the customer is charged is what the catalogue says at the moment of
                     * the charge, and this is that moment.
                     */
                    const unitPrice = resolveEffectivePrice(
                        product.price,
                        product,
                        await activeDiscounts()
                    ).effective
                    const subtotal = multiplyMoney(unitPrice, config.quantity)
                    const total = addMoney(subtotal, shippingCost)

                    const orderNumber = await this.generateOrderNumber(tx)

                    const order = await tx.order.create({
                        data: {
                            userId,
                            orderNumber,
                            subtotal,
                            shippingCost,
                            total,
                            idempotencyKey,
                            status: "awaiting_shipment",
                            shippingOption,
                            shippingAddressId,
                            configurationId,
                            customerNotes: `idempotency:${idempotencyKey}`,
                            items: {
                                create: {
                                    productId: product.id,
                                    productName: product.translations[0]?.name || product.productId,
                                    productImage: product.images[0]?.url ?? "",
                                    // The unit price CHARGED, so `price × quantity` reconciles
                                    // with the order's subtotal. It was `product.price` — the
                                    // base — which only agreed with the subtotal while no
                                    // discount existed.
                                    price: unitPrice,
                                    quantity: config.quantity,
                                    selectedColorTemp: config.selectedColorTemp as any,
                                    selectedColorKey: config.selectedColorKey,
                                    configurationId,
                                },
                            },
                        },
                    })

                    // RESERVE, do not sell (§8.3). Nothing has physically moved yet: the SALE
                    // movement is written when the order ships. Writing one here would put a
                    // fiction in an append-only ledger, and a cancellation would then need a
                    // compensating movement for a sale that never happened.
                    await reserve(tx, product.id, config.quantity)

                    // The confirmation is queued IN THIS TRANSACTION (§16). Before P2 this
                    // was `OrderQueue.queueOrderConfirmation()` — three console.log calls
                    // behind a class name — so a customer who ordered received nothing at all.
                    //
                    // Queueing here rather than sending here is the point: if the transaction
                    // rolls back there is no confirmation for an order that does not exist,
                    // and if it commits the email is guaranteed to go out even if Resend is
                    // unreachable at this instant. The dedupeKey means a retried checkout
                    // queues one email, not one per attempt.
                    const [customer, address] = await Promise.all([
                        tx.user.findUnique({
                            where: { id: userId },
                            select: { email: true, name: true, preferredLanguage: true },
                        }),
                        shippingAddressId
                            ? tx.shippingAddress.findUnique({ where: { id: shippingAddressId } })
                            : Promise.resolve(null),
                    ])

                    if (customer?.email && address) {
                        const locale = resolveLocale(customer.preferredLanguage)

                        // Everything the customer needs to recognise what they bought:
                        // the picture, the code, the configured colour and colour
                        // temperature, the specifications — in THEIR language, which is why
                        // it is resolved here and not from the default-locale copy loaded
                        // above for pricing.
                        const details = await describeOrderedProduct(tx, {
                            productId: product.id,
                            locale,
                            selectedColorTemp: config.selectedColorTemp,
                            selectedColorKey: config.selectedColorKey,
                            fallbackName: product.translations[0]?.name || product.productId,
                            fallbackSku: product.productId,
                        })

                        await queueMail(tx, {
                            template: "order-confirmation",
                            to: customer.email,
                            locale,
                            payload: {
                                orderNumber: order.orderNumber,
                                items: [
                                    {
                                        name: details.name,
                                        quantity: config.quantity,
                                        price: serializeMoney(unitPrice),
                                        lineTotal: serializeMoney(subtotal),
                                        sku: details.sku,
                                        imageUrl: details.imageUrl,
                                        productUrl: details.productUrl,
                                        attributes: details.attributes,
                                    },
                                ],
                                subtotal: serializeMoney(subtotal),
                                shippingCost: serializeMoney(shippingCost),
                                total: serializeMoney(total),
                                currency: config.currency ?? "EGP",
                                address: {
                                    fullName: address.fullName,
                                    phone: address.phone,
                                    addressLine1: address.addressLine1,
                                    addressLine2: address.addressLine2 ?? undefined,
                                    city: address.city,
                                    country: address.country,
                                },
                                orderUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/orders/${order.id}`,
                            },
                            dedupeKey: `order-confirmation:${order.id}`,
                        })
                    } else {
                        // Not fatal — the order is real either way — but it is the one case
                        // where a customer silently gets no confirmation, so it is logged.
                        console.warn(`[order] no confirmation queued for ${order.orderNumber}: missing customer email or address`)
                    }

                    /*
                     * The administrators' notification, in the SAME transaction (§17).
                     *
                     * Same reason as the confirmation: an order that commits always has its
                     * notification row, and a push service that is unreachable cannot roll
                     * back an order. HIGH because an unshipped order is the one thing in this
                     * system with a customer waiting at the other end of it.
                     */
                    await notifyRecipients(tx, recipients, {
                        type: "NEW_ORDER",
                        title: `New order ${order.orderNumber}`,
                        message: `${serializeMoney(total)} ${config.currency ?? "EGP"} · ${config.quantity} × ${product.translations[0]?.name || product.productId}`,
                        actionUrl: `/admin/orders/${order.id}`,
                        priority: "HIGH",
                        metadata: {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            total: serializeMoney(total),
                            currency: config.currency ?? "EGP",
                            productId: product.id,
                        },
                    })

                    return {
                        success: true as const,
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        isDuplicate: false,
                    }
                },
                {
                    maxWait: 15000,
                    timeout: 30000,
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                }
            )

            /*
             * After the commit, and not awaited. The order is durable and the customer's
             * response should not wait on a round trip to Google's push service. The cron
             * sweep in /api/cron/push is what turns this from a hope into a guarantee: if
             * this instance is torn down first, the row is still unpushed and the next tick
             * picks it up.
             */
            dispatchPushSoon(prisma)

            return result
        } catch (error) {
            console.error("Order creation error:", error)

            // Return structured error
            if (error instanceof Error) {
                return {
                    success: false,
                    error: error.message,
                }
            }

            return {
                success: false,
                error: "Failed to create order",
            }
        }
    }

    private static async findOrderByIdempotencyKey(userId: string, idempotencyKey: string) {
        return await prisma.order.findUnique({
            where: {
                idempotencyKey,
            },
            select: { id: true, orderNumber: true, userId: true },
        })
    }

    private static async generateOrderNumber(
        tx: Prisma.TransactionClient,
        maxRetries = 3
    ): Promise<string> {
        for (let i = 0; i < maxRetries; i++) {
            const orderNumber = `ORD-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)
                .toUpperCase()}`

            const exists = await tx.order.findUnique({
                where: { orderNumber },
                select: { id: true },
            })

            if (!exists) return orderNumber
        }

        throw new Error("Failed to generate unique order number")
    }

    /**
     * cancelOrder() is DELETED. Cancellation is a state TRANSITION, and transitions live in
     * one machine (ADR 0005, §13.2).
     *
     * This method had its own copy of the rules: which statuses may be cancelled, what happens
     * to stock, what the order row becomes. So did `updateOrderStatus`. Two copies of a state
     * machine are two state machines, and they drift — this one still allowed cancelling from
     * `processing`, a status 0010 removed.
     *
     * Callers use `transitionOrderWithNotification({ to: "cancelled", ... })`, which releases
     * the reservation, writes the audit row with an actorType, and queues the customer's email
     * in the same transaction.
     */
}


/**
 * Everything the confirmation email says about the product that is not a price.
 *
 * A separate query from the one that priced the order, and deliberately so: that one loads the
 * DEFAULT locale because pricing does not care what language anybody reads, and this one loads
 * the CUSTOMER's. Reusing it would send an Arabic-speaking customer an English specification
 * table, or the reverse, depending on a default nobody set for this purpose.
 *
 * Runs inside the order transaction. It is a read of rows the transaction already touched, and
 * putting it outside would open a window where the email describes a product that has since
 * been edited.
 */
async function describeOrderedProduct(
    tx: Prisma.TransactionClient,
    input: {
        productId: string
        locale: Locale
        selectedColorTemp: string | null
        selectedColorKey: string | null
        /**
         * What the caller already knows, from the row it priced the order against. Used when
         * this lookup finds nothing — which cannot happen inside the order's own transaction,
         * but the alternative to naming it is a confirmation email with a BLANK product name,
         * and a defensive branch that produces worse output than no branch is not defensive.
         */
        fallbackName: string
        fallbackSku: string
    }
): Promise<{
    name: string
    sku: string
    imageUrl?: string
    productUrl?: string
    attributes: Array<{ label: string; value: string }>
}> {
    const product = await tx.product.findUnique({
        where: { id: input.productId },
        select: {
            productId: true,
            slug: true,
            translations: { where: { locale: input.locale }, take: 1, select: { name: true } },
            images: { orderBy: { order: "asc" }, select: { url: true, colorId: true } },
            specs: {
                select: {
                    valueNumber: true,
                    valueEn: true,
                    valueAr: true,
                    valueBool: true,
                    spec: { select: { labelEn: true, labelAr: true, unitEn: true, unitAr: true, order: true } },
                },
            },
            availableColors: {
                select: { color: { select: { id: true, key: true, nameEn: true, nameAr: true } } },
            },
            subCategory: {
                select: {
                    translations: { where: { locale: input.locale }, take: 1, select: { slug: true } },
                    category: {
                        select: { translations: { where: { locale: input.locale }, take: 1, select: { slug: true } } },
                    },
                },
            },
        },
    })

    if (!product) return { name: input.fallbackName, sku: input.fallbackSku, attributes: [] }

    const arabic = input.locale === "ar"
    const attributes: Array<{ label: string; value: string }> = []

    if (input.selectedColorTemp) {
        const copy = COLOR_TEMP_COPY[input.selectedColorTemp]
        attributes.push({
            label: arabic ? "درجة حرارة اللون" : "Colour temperature",
            // An unrecognised value is shown as itself rather than dropped: a customer seeing
            // "WARM_2700K" can still ask about it, and a customer seeing nothing cannot.
            value: copy ? (arabic ? copy.ar : copy.en) : input.selectedColorTemp,
        })
    }

    const color = product.availableColors.find((row) => row.color.key === input.selectedColorKey)?.color
    if (color) {
        attributes.push({ label: arabic ? "اللون" : "Colour", value: arabic ? color.nameAr : color.nameEn })
    }

    for (const spec of [...product.specs].sort((a, b) => a.spec.order - b.spec.order)) {
        const value = formatSpecValue(spec, arabic)
        if (value) attributes.push({ label: arabic ? spec.spec.labelAr : spec.spec.labelEn, value })
    }

    // The image OF THE COLOUR THEY CHOSE, when there is one. Showing the default finish next
    // to the words "Colour: bronze" is worse than showing no picture at all.
    const image = (color ? product.images.find((row) => row.colorId === color.id) : undefined) ?? product.images[0]

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? ""
    const categorySlug = product.subCategory.category.translations[0]?.slug
    const subCategorySlug = product.subCategory.translations[0]?.slug

    return {
        // `||` and not `??`: a translation row that exists with an empty name is as useless as
        // a missing one, and the untranslated-product queue (§13.2 item 7) means those exist.
        name: product.translations[0]?.name || input.fallbackName || product.productId,
        sku: product.productId,
        // Only an absolute URL is any use in an email client, so a missing origin means no
        // image rather than a broken one.
        imageUrl: origin && image?.url ? absolute(origin, image.url) : undefined,
        productUrl:
            origin && categorySlug && subCategorySlug
                ? `${origin}/${input.locale}/category/${encodeSlug(categorySlug)}/${encodeSlug(subCategorySlug)}/${encodeSlug(product.slug)}`
                : undefined,
        attributes,
    }
}

/** Cloudinary URLs are already absolute; the seeded catalogue's are paths under /public. */
function absolute(origin: string, url: string): string {
    return /^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith("/") ? "" : "/"}${url}`
}

const COLOR_TEMP_COPY: Record<string, { en: string; ar: string }> = {
    WARM_3000K: { en: "Warm white (3000K)", ar: "أبيض دافئ (3000 كلفن)" },
    COOL_4000K: { en: "Cool white (4000K)", ar: "أبيض محايد (4000 كلفن)" },
    WHITE_6500K: { en: "Daylight (6500K)", ar: "أبيض نهاري (6500 كلفن)" },
}

function formatSpecValue(
    spec: {
        valueNumber: Prisma.Decimal | null
        valueEn: string | null
        valueAr: string | null
        valueBool: boolean | null
        spec: { unitEn: string | null; unitAr: string | null }
    },
    arabic: boolean
): string | null {
    if (spec.valueBool !== null) return arabic ? (spec.valueBool ? "نعم" : "لا") : spec.valueBool ? "Yes" : "No"

    if (spec.valueNumber !== null) {
        // toString(), not toNumber(): a Decimal through a float is the exact defect migration
        // 0001 exists to remove, and this one ends up in front of a customer.
        const unit = arabic ? spec.spec.unitAr : spec.spec.unitEn
        return unit ? `${spec.valueNumber.toString()} ${unit}` : spec.valueNumber.toString()
    }

    const text = arabic ? (spec.valueAr ?? spec.valueEn) : (spec.valueEn ?? spec.valueAr)
    return text && text.trim().length > 0 ? text : null
}
