"use server"

import type { OrderWithDetails } from '@/types'
import { auth } from "@clerk/nextjs/server"
import { prisma, ProductColorTemp } from "@repo/database"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"


// No authentication required - anyone can view configuration details
export async function getConfigurationDetails(configId: string) {
    try {
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: {
                users: true
            }
        })

        return configuration
    } catch (error) {
        console.error("Error getting configuration details:", error)
        return null
    }
}

// No authentication required - anyone can get product details
export async function getProductWithDetails(productId: string, locale: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { productId },
            include: {
                translations: {
                    where: { locale },
                    take: 1,
                },
                subCategory: {
                    include: {
                        translations: {
                            where: { locale },
                            take: 1,
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        })

        return product
    } catch (error) {
        console.error("Error getting product details:", error)
        return null
    }
}

// Authentication required for shipping address
export async function getUserShippingAddress(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                shippingAddress: true,
            },
        })
        return user?.shippingAddress || null
    } catch (error) {
        console.error("Error getting shipping address:", error)
        return null
    }
}

// Authentication required for saving shipping address
export async function saveShippingAddress(userId: string, data: {
    fullName: string
    phone: string
    email?: string
    addressLine1: string
    addressLine2?: string
    city: string
    state?: string
    postalCode: string
    country?: string
}) {
    try {
        const existingAddress = await prisma.shippingAddress.findUnique({
            where: { userId }
        })

        if (existingAddress) {
            const updated = await prisma.shippingAddress.update({
                where: { userId },
                data: {
                    ...data,
                    country: data.country || "Egypt"
                }
            })
            return { success: true, address: updated }
        } else {
            const created = await prisma.shippingAddress.create({
                data: {
                    userId,
                    ...data,
                    country: data.country || "Egypt",
                    isDefault: true
                }
            })
            return { success: true, address: created }
        }
    } catch (error) {
        console.error("Error saving shipping address:", error)
        return { success: false, error: "Failed to save shipping address" }
    }
}

// Authentication required for creating orders
export async function createOrderFromConfiguration(
    configId: string,
    shippingOption: "BasicShipping" | "StandardShipping" | "ExpressShipping" = "StandardShipping"
) {
    try {
        const { userId } = await auth()
        
        if (!userId) {
            console.log("User not authenticated");
            return { 
                success: false, 
                error: "Authentication required to create an order",
                requiresAuth: true 
            }
        }

        // Get configuration with users relation
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: {
                users: true
            }
        })

        if (!configuration) {
            return { success: false, error: "Configuration not found" }
        }

        // Get product
        const product = await prisma.product.findUnique({
            where: { productId: configuration.productId },
            include: {
                translations: {
                    take: 1
                }
            }
        })

        if (!product) {
            return { success: false, error: "Product not found" }
        }

        // Get shipping address
        const shippingAddress = await prisma.shippingAddress.findUnique({
            where: { userId }
        })

        if (!shippingAddress) {
            return { 
                success: false, 
                error: "Shipping address not found. Please add your shipping details first.",
                needsShippingAddress: true 
            }
        }

        // Calculate shipping cost based on option
        const shippingCosts = {
            BasicShipping: 50,
            StandardShipping: 100,
            ExpressShipping: 200
        }
        const shippingCost = shippingCosts[shippingOption]

        const subtotal = configuration.totalPrice

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        // Convert selectedColorTemp to ProductColorTemp enum if it exists
        let colorTemp: ProductColorTemp | null = null
        if (configuration.selectedColorTemp) {
            colorTemp = configuration.selectedColorTemp as ProductColorTemp
        }

        // Create order
        const order = await prisma.order.create({
            data: {
                userId,
                orderNumber,
                subtotal,
                shippingCost,
                total: subtotal + shippingCost,
                status: "awaiting_shipment",
                shippingOption,
                shippingAddressId: shippingAddress.id,
                configurationId: configId,
                items: {
                    create: {
                        productId: product.id,
                        productName: product.translations[0]?.name || product.productId,
                        productImage: product.images[0] || "",
                        price: product.price,
                        quantity: configuration.quantity,
                        selectedColorTemp: colorTemp,
                        selectedColor: configuration.selectedColor,
                        configurationId: configId
                    }
                }
            },
            include: {
                items: true,
                shippingAddress: true
            }
        })

        // Associate configuration with user if not already associated
        const hasUsers = configuration.users && configuration.users.length > 0
        
        if (!hasUsers) {
            await prisma.configuration.update({
                where: { id: configId },
                data: {
                    users: {
                        connect: { id: userId }
                    }
                }
            })
        }

        revalidatePath("/orders")

        return { success: true, order }
    } catch (error) {
        console.error("Error creating order:", error)
        return { success: false, error: "Failed to create order" }
    }
}

// Authentication required for getting order details
export async function getOrderDetails(
    orderId: string
): Promise<OrderWithDetails | null> {
    const { userId } = await auth()

    if (!userId) {
        console.log("User not authenticated")
        return null
    }

    try {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                translations: true
                            }
                        },
                        configuration: true
                    }
                },
                shippingAddress: true,
                configuration: true
            }
        })

        return order
    } catch (error) {
        console.error("Error getting order details:", error)
        return null
    }
}