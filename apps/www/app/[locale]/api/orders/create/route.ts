import { OrderService } from "@/lib/services/order-service"
import { createOrderSchema } from "@/lib/validation/scehma"
import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"


/**
 * POST - Create new order
 * 
 * This endpoint creates an order with:
 * - Full validation
 * - Transactional safety
 * - Inventory reservation
 * - Idempotency support
 */


export async function POST(request: NextRequest) {
    // 1. Authenticate user
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
        )
    }

    try {
        // 2. Parse and validate request body
        const body = await request.json()
        const validation = createOrderSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: "Invalid request data",
                    details: validation.error
                },
                { status: 400 }
            )
        }

        const { configurationId, shippingAddressId, shippingOption, idempotencyKey } = validation.data

        // 3. Create order using OrderService (handles all business logic)
        const result = await OrderService.createOrder({
            userId,
            configurationId,
            shippingAddressId,
            shippingOption,
            idempotencyKey: idempotencyKey || `${userId}-${configurationId}-${Date.now()}`,
        })

        // 4. Check if result has success property and handle accordingly
        if (!result.success) {
            return NextResponse.json(
                { error: "Failed to create order" },
                { status: 400 }
            )
        }

        // 5. Return success response
        return NextResponse.json(
            {
                success: true,
                orderId: result.orderId,
                orderNumber: result.orderNumber,
                isDuplicate: result.isDuplicate || false,
                message: result.isDuplicate
                    ? "Order already exists"
                    : "Order created successfully",
            },
            { status: result.isDuplicate ? 200 : 201 }
        )

    } catch (error) {
        console.error("Order creation error:", error)

        // Handle specific errors
        if (error instanceof Error) {
            // Inventory errors
            if (error.message.includes("Insufficient inventory")) {
                return NextResponse.json(
                    { error: "One or more products are out of stock" },
                    { status: 409 }
                )
            }

            // Configuration errors
            if (error.message.includes("Configuration not found")) {
                return NextResponse.json(
                    { error: "Configuration not found" },
                    { status: 404 }
                )
            }

            // Product errors
            if (error.message.includes("Product not found")) {
                return NextResponse.json(
                    { error: "Product not found" },
                    { status: 404 }
                )
            }
        }

        // Generic error response
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}