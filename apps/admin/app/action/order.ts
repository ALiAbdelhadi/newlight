"use server"

import type { OrderWithDetails } from '@/types'
import { currentAdminId } from "@/lib/auth"
import { prisma, ProductColorTemp , addMoney } from "@repo/database"
import { createHash } from "crypto"
import { revalidatePath } from "next/cache"

export async function getConfigurationDetails(configId: string) {
    try {
        const configuration = await prisma.productConfiguration.findUnique({
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

export async function getProductWithDetails(productId: string, locale: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { productId },
            include: {
                images: { orderBy: { order: "asc" as const }, take: 1 },
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

export async function createOrderFromConfiguration(
    configId: string,
    shippingOption: "BasicShipping" | "StandardShipping" | "ExpressShipping" = "StandardShipping"
) {
    try {
        const userId = await currentAdminId()
        
        if (!userId) {
            console.log("User not authenticated");
            return { 
                success: false, 
                error: "Authentication required to create an order",
                requiresAuth: true 
            }
        }

        const configuration = await prisma.productConfiguration.findUnique({
            where: { id: configId },
            include: {
                users: true
            }
        })

        if (!configuration) {
            return { success: false, error: "Configuration not found" }
        }

        const product = await prisma.product.findUnique({
            where: { id: configuration.productId },
            include: {
                translations: { where: { locale: "en" }, take: 1 },
                images: { orderBy: { order: "asc" as const }, take: 1 },
            },
        })

        if (!product) {
            return { success: false, error: "Product not found" }
        }

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

        const shippingCosts = {
            BasicShipping: 50,
            StandardShipping: 100,
            ExpressShipping: 200
        }
        const shippingCost = shippingCosts[shippingOption]

        const subtotal = configuration.totalPrice

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        let colorTemp: ProductColorTemp | null = null
        if (configuration.selectedColorTemp) {
            colorTemp = configuration.selectedColorTemp as ProductColorTemp
        }

        const order = await prisma.order.create({
            data: {
                userId,
                orderNumber,
                subtotal,
                shippingCost,
                total: addMoney(subtotal, shippingCost),
                status: "awaiting_shipment",
                shippingOption,
                idempotencyKey: createHash("sha256")
                    .update(`${userId}-${configId}-admin-v1`)
                    .digest("hex"),
                shippingAddressId: shippingAddress.id,
                configurationId: configId,
                items: {
                    create: {
                        productId: product.id,
                        productName: product.translations[0]?.name || product.productId,
                        productImage: product.images[0]?.url ?? "",
                        price: product.price,
                        quantity: configuration.quantity,
                        selectedColorTemp: colorTemp,
                        selectedColorKey: configuration.selectedColorKey,
                        configurationId: configId
                    }
                }
            },
            include: {
                items: true,
                shippingAddress: true
            }
        })

        const hasUsers = configuration.users && configuration.users.length > 0
        
        if (!hasUsers) {
            await prisma.productConfiguration.update({
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

export async function getOrderDetails(
    orderId: string
): Promise<OrderWithDetails | null> {
    const userId = await currentAdminId()

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