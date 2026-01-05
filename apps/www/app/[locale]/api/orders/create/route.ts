import { auth } from "@clerk/nextjs/server"
import { Prisma, prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// ============================================
// Schema Validation
// ============================================

const createOrderSchema = z.object({
    configurationId: z.string().cuid(),
    shippingOption: z.enum(["BasicShipping", "StandardShipping", "ExpressShipping"]),
    idempotencyKey: z.string().uuid().optional(),
})

type CreateOrderInput = z.infer<typeof createOrderSchema>

interface OrderCreationResult {
    success: boolean
    orderId?: string
    orderNumber?: string
    error?: string
    statusCode: number
}

// ============================================
// Idempotency Check (24h window)
// ============================================

async function checkIdempotency(
    userId: string,
    idempotencyKey: string
): Promise<string | null> {
    const existingOrder = await prisma.order.findFirst({
        where: {
            userId,
            customerNotes: { contains: `idempotency:${idempotencyKey}` },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
    })

    return existingOrder?.id || null
}

// ============================================
// Unique Order Number Generator
// ============================================

async function generateUniqueOrderNumber(maxRetries = 3): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
        const orderNumber = `ORD-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)
            .toUpperCase()}`

        const exists = await prisma.order.findUnique({
            where: { orderNumber },
            select: { id: true },
        })

        if (!exists) return orderNumber
    }

    throw new Error("Failed to generate unique order number")
}

// ============================================
// Shipping Cost Calculator
// ============================================

const SHIPPING_COSTS = {
    BasicShipping: 50,
    StandardShipping: 100,
    ExpressShipping: 200,
} as const

function calculateShippingCost(
    option: "BasicShipping" | "StandardShipping" | "ExpressShipping"
): number {
    return SHIPPING_COSTS[option]
}

// ============================================
// Core Transaction - Order Creation
// ============================================

async function createOrderTransaction(
    userId: string,
    input: CreateOrderInput,
    shippingAddressId: string,
    idempotencyKey: string
): Promise<OrderCreationResult> {
    try {
        const result = await prisma.$transaction(
            async (tx) => {
                // 1. Fetch configuration
                const configuration = await tx.configuration.findUnique({
                    where: { id: input.configurationId },
                    include: { users: true },
                })

                if (!configuration) {
                    throw new Error("CONFIGURATION_NOT_FOUND")
                }

                // 2. Fetch and LOCK product (prevents race conditions)
                const product = await tx.product.findUnique({
                    where: { productId: configuration.productId },
                    include: { translations: { take: 1 } },
                })

                if (!product) {
                    throw new Error("PRODUCT_NOT_FOUND")
                }

                // 3. Validate inventory (atomic check)
                if (product.inventory < configuration.quantity) {
                    throw new Error("INSUFFICIENT_INVENTORY")
                }

                // 4. Calculate totals
                const shippingCost = calculateShippingCost(input.shippingOption)
                const subtotal = configuration.totalPrice
                const total = subtotal + shippingCost

                // 5. Generate unique order number
                const orderNumber = await generateUniqueOrderNumber()

                // 6. Create order + items (atomic)
                const order = await tx.order.create({
                    data: {
                        userId,
                        orderNumber,
                        subtotal,
                        shippingCost,
                        total,
                        status: "awaiting_shipment",
                        shippingOption: input.shippingOption,
                        shippingAddressId,
                        configurationId: input.configurationId,
                        customerNotes: `idempotency:${idempotencyKey}`, // Store for deduplication
                        items: {
                            create: {
                                productId: product.id,
                                productName: product.translations[0]?.name || product.productId,
                                productImage: product.images[0] || "",
                                price: product.price,
                                quantity: configuration.quantity,
                                selectedColorTemp: configuration.selectedColorTemp as any,
                                selectedColor: configuration.selectedColor,
                                configurationId: input.configurationId,
                            },
                        },
                    },
                    include: { items: true, shippingAddress: true },
                })

                // 7. Reserve inventory (atomic decrement)
                await tx.product.update({
                    where: { id: product.id },
                    data: { inventory: { decrement: configuration.quantity } },
                })

                // 8. Link configuration to user (if not linked)
                if (!configuration.users || configuration.users.length === 0) {
                    await tx.configuration.update({
                        where: { id: input.configurationId },
                        data: { users: { connect: { id: userId } } },
                    })
                }

                return {
                    success: true,
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    statusCode: 201,
                }
            },
            {
                maxWait: 5000, // Max wait for lock acquisition
                timeout: 10000, // Max transaction duration
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Strongest isolation
            }
        )

        return result
    } catch (error) {
        // Handle domain errors
        if (error instanceof Error) {
            if (error.message === "CONFIGURATION_NOT_FOUND") {
                return { success: false, error: "Configuration not found", statusCode: 404 }
            }
            if (error.message === "PRODUCT_NOT_FOUND") {
                return { success: false, error: "Product not found", statusCode: 404 }
            }
            if (error.message === "INSUFFICIENT_INVENTORY") {
                return { success: false, error: "Insufficient inventory", statusCode: 409 }
            }
        }

        console.error("Order creation failed:", error)
        return { success: false, error: "Internal server error", statusCode: 500 }
    }
}

// ============================================
// API Endpoint
// ============================================

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }

        // 2. Parse & validate
        const body = await request.json()
        const validation = createOrderSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid request",
                    details: validation.error,
                },
                { status: 400 }
            )
        }

        const input = validation.data

        // 3. Generate idempotency key (or use client's)
        const idempotencyKey =
            input.idempotencyKey || `${userId}-${input.configurationId}-${Date.now()}`

        // 4. Check for duplicate (idempotency layer)
        const existingOrderId = await checkIdempotency(userId, idempotencyKey)

        if (existingOrderId) {
            return NextResponse.json(
                {
                    success: true,
                    orderId: existingOrderId,
                    message: "Order already exists",
                },
                { status: 200 }
            )
        }

        // 5. Validate shipping address
        const shippingAddress = await prisma.shippingAddress.findUnique({
            where: { userId },
            select: { id: true },
        })

        if (!shippingAddress) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Shipping address required",
                    needsShippingAddress: true,
                },
                { status: 400 }
            )
        }

        // 6. Create order (transactional + atomic)
        const result = await createOrderTransaction(
            userId,
            input,
            shippingAddress.id,
            idempotencyKey
        )

        // 7. Return response
        if (result.success) {
            // TODO: Queue background jobs
            // await queuePaymentProcessing(result.orderId)
            // await queueOrderConfirmationEmail(result.orderId)

            return NextResponse.json(
                {
                    success: true,
                    orderId: result.orderId,
                    orderNumber: result.orderNumber,
                },
                { status: result.statusCode }
            )
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: result.statusCode }
            )
        }
    } catch (error) {
        console.error("Unhandled error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}