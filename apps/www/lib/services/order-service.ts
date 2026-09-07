/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    addMoney,
    DEFAULT_LOCATION_ID,
    getShippingRates,
    money,
    Prisma,
    prisma,
    release,
    reserve,
    resolveLocale,
    serializeMoney,
} from "@repo/database"
import { queueMail } from "@repo/mail/outbox"

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
                    const subtotal = money(config.totalPrice)
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
                                    price: product.price,
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
                        await queueMail(tx, {
                            template: "order-confirmation",
                            to: customer.email,
                            locale: resolveLocale(customer.preferredLanguage),
                            payload: {
                                orderNumber: order.orderNumber,
                                items: [
                                    {
                                        name: product.translations[0]?.name || product.productId,
                                        quantity: config.quantity,
                                        price: serializeMoney(product.price),
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
                                orderUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${resolveLocale(customer.preferredLanguage)}/orders/${order.id}`,
                            },
                            dedupeKey: `order-confirmation:${order.id}`,
                        })
                    } else {
                        // Not fatal — the order is real either way — but it is the one case
                        // where a customer silently gets no confirmation, so it is logged.
                        console.warn(`[order] no confirmation queued for ${order.orderNumber}: missing customer email or address`)
                    }

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
