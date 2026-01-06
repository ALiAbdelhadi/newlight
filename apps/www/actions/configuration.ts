"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@repo/database"
import { revalidatePath } from "next/cache"
import { ProductService } from "@/lib/services/product-service"
import { UserService } from "@/lib/services/user-service"

interface SaveConfigurationArgs {
    productId: string
    quantity: number
    selectedColorTemp?: string
    selectedColor?: string
    configId?: string
}

/**
 * Save or update configuration
 * Note: Configurations don't go through service layer as they're temporary/session data
 * But we use ProductService for product validation
 */
export async function saveConfiguration(args: SaveConfigurationArgs) {
    try {
        // Get userId (optional for guests)
        const { userId } = await auth()

        // 1. Validate product exists using ProductService
        const product = await ProductService.getProduct(args.productId, "en")

        if (!product) {
            return {
                success: false,
                error: "Product not found",
            }
        }

        // 2. If user is logged in, handle user configuration
        if (userId) {
            // Ensure user exists
            await UserService.getOrCreateUser(userId)

            // If updating existing config
            if (args.configId) {
                const existingConfig = await prisma.configuration.findFirst({
                    where: {
                        id: args.configId,
                        users: {
                            some: { id: userId },
                        },
                    },
                })

                if (existingConfig) {
                    const updatedConfig = await prisma.configuration.update({
                        where: { id: args.configId },
                        data: {
                            value: JSON.stringify({
                                productId: args.productId,
                                selectedColorTemp: args.selectedColorTemp,
                                selectedColor: args.selectedColor,
                            }),
                            quantity: args.quantity,
                            totalPrice: product.price * args.quantity,
                        },
                    })

                    revalidatePath(`/preview/${args.configId}`)

                    return {
                        success: true,
                        configId: updatedConfig.id,
                        productId: args.productId,
                    }
                }
            }

            // Create new configuration with user connection
            const configuration = await prisma.configuration.create({
                data: {
                    key: `config_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    value: JSON.stringify({
                        productId: args.productId,
                        selectedColorTemp: args.selectedColorTemp,
                        selectedColor: args.selectedColor,
                    }),
                    productId: args.productId,
                    configPrice: product.price,
                    priceIncrease: 0,
                    shippingPrice: 0,
                    discount: 0,
                    quantity: args.quantity,
                    totalPrice: product.price * args.quantity,
                    currency: "EGP",
                    selectedColorTemp: args.selectedColorTemp,
                    selectedColor: args.selectedColor,
                    users: {
                        connect: { id: userId },
                    },
                },
            })

            revalidatePath(`/preview/${configuration.id}`)

            return {
                success: true,
                configId: configuration.id,
                productId: args.productId,
            }
        }

        // 3. Guest configuration (no user connection)
        const configuration = await prisma.configuration.create({
            data: {
                key: `config_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                value: JSON.stringify({
                    productId: args.productId,
                    selectedColorTemp: args.selectedColorTemp,
                    selectedColor: args.selectedColor,
                }),
                productId: args.productId,
                configPrice: product.price,
                priceIncrease: 0,
                shippingPrice: 0,
                discount: 0,
                quantity: args.quantity,
                totalPrice: product.price * args.quantity,
                currency: "EGP",
                selectedColorTemp: args.selectedColorTemp,
                selectedColor: args.selectedColor,
            },
        })

        revalidatePath(`/preview/${configuration.id}`)

        return {
            success: true,
            configId: configuration.id,
            productId: args.productId,
        }

    } catch (error) {
        console.error("Failed to save configuration:", error)

        return {
            success: false,
            error: "Failed to save configuration",
        }
    }
}

/**
 * Get configuration by ID
 */
export async function getConfiguration(configId: string) {
    try {
        const { userId } = await auth()

        // If user is logged in, check if config belongs to them
        if (userId) {
            const configuration = await prisma.configuration.findFirst({
                where: {
                    id: configId,
                    users: {
                        some: { id: userId },
                    },
                },
                include: {
                    users: true,
                },
            })

            if (configuration) {
                // Parse stored value
                let configValue
                try {
                    configValue = JSON.parse(configuration.value)
                } catch (e) {
                    console.error("Failed to parse configuration value:", e)
                    configValue = {}
                }

                return {
                    ...configuration,
                    selectedColorTemp: configValue.selectedColorTemp || configuration.selectedColorTemp,
                    selectedColor: configValue.selectedColor || configuration.selectedColor,
                }
            }
        }

        // For guests or if not found with user check
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: {
                users: true,
            },
        })

        if (!configuration) {
            return null
        }

        // Parse stored value
        let configValue
        try {
            configValue = JSON.parse(configuration.value)
        } catch (e) {
            configValue = {}
        }

        return {
            ...configuration,
            selectedColorTemp: configValue.selectedColorTemp || configuration.selectedColorTemp,
            selectedColor: configValue.selectedColor || configuration.selectedColor,
        }

    } catch (error) {
        console.error("Failed to get configuration:", error)
        return null
    }
}

/**
 * Update configuration quantity
 */
export async function updateConfigurationQuantity({
    configId,
    quantity,
}: {
    configId: string
    quantity: number
}) {
    try {
        const { userId } = await auth()

        if (quantity < 1) {
            return {
                success: false,
                error: "Invalid quantity",
            }
        }

        // If user is logged in, verify ownership
        if (userId) {
            const config = await prisma.configuration.findFirst({
                where: {
                    id: configId,
                    users: {
                        some: { id: userId },
                    },
                },
                include: {
                    users: true,
                },
            })

            if (config) {
                const newTotalPrice = config.configPrice * quantity - config.discount

                const updatedConfig = await prisma.configuration.update({
                    where: { id: configId },
                    data: {
                        quantity,
                        totalPrice: newTotalPrice,
                    },
                })

                revalidatePath(`/preview/${configId}`)

                return {
                    success: true,
                    configuration: updatedConfig,
                }
            }
        }

        // For guests
        const config = await prisma.configuration.findUnique({
            where: { id: configId },
            include: {
                users: true,
            },
        })

        if (!config) {
            return {
                success: false,
                error: "Configuration not found",
            }
        }

        const newTotalPrice = config.configPrice * quantity - config.discount

        const updatedConfig = await prisma.configuration.update({
            where: { id: configId },
            data: {
                quantity,
                totalPrice: newTotalPrice,
            },
        })

        revalidatePath(`/preview/${configId}`)

        return {
            success: true,
            configuration: updatedConfig,
        }

    } catch (error) {
        console.error("Failed to update configuration quantity:", error)

        return {
            success: false,
            error: "Failed to update configuration quantity",
        }
    }
}

/**
 * Associate configuration with user (when they sign in)
 */
export async function associateConfigurationWithUser(configId: string, userId: string) {
    try {
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: { users: true },
        })

        if (!configuration) {
            return {
                success: false,
                error: "Configuration not found",
            }
        }

        // If configuration already has users, don't override
        if (configuration.users.length > 0) {
            return {
                success: false,
                error: "Configuration already has an owner",
            }
        }

        // Ensure user exists
        await UserService.getOrCreateUser(userId)

        // Associate configuration with user
        await prisma.configuration.update({
            where: { id: configId },
            data: {
                users: {
                    connect: { id: userId },
                },
            },
        })

        return {
            success: true,
            message: "Configuration associated with user",
        }

    } catch (error) {
        console.error("Failed to associate configuration with user:", error)

        return {
            success: false,
            error: "Failed to associate configuration with user",
        }
    }
}