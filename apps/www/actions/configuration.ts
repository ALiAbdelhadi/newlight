"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@repo/database"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

interface SaveConfigurationArgs {
    productId: string
    quantity: number
    selectedColorTemp?: string
    selectedColor?: string
    configId?: string
}

export async function saveConfiguration(args: SaveConfigurationArgs) {
    // Get userId but don't require it for saveConfiguration
    const { userId } = await auth()

    try {
        // Get product details
        const product = await prisma.product.findUnique({
            where: { productId: args.productId },
            include: {
                translations: {
                    where: { locale: "en" },
                    take: 1,
                },
            },
        })

        if (!product) {
            throw new Error("Product not found")
        }

        // If user is logged in, try to update existing config
        if (userId) {
            // Ensure user exists
            let user = await prisma.user.findUnique({
                where: { id: userId },
            })

            if (!user) {
                user = await prisma.user.create({
                    data: { id: userId },
                })
            }

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

        // Create new configuration WITHOUT user (for guests)
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
        throw new Error("Failed to save configuration")
    }
}

export async function getConfiguration(configId: string) {
    const { userId } = await auth()

    // Allow getting configuration without authentication
    try {
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
                // Parse the stored value safely
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

        // For guests or if not found with user, try to get config without user check
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: {
                users: true,
            },
        })

        if (!configuration) {
            return null
        }

        // Parse the stored value
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

export async function updateConfigurationQuantity({
    configId,
    quantity,
}: {
    configId: string
    quantity: number
}) {
    const { userId } = await auth()

    if (quantity < 1) {
        throw new Error("Invalid quantity")
    }

    try {
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
                    users: true
                }
            })

            if (config) {
                const newTotalPrice = (config.configPrice * quantity) - config.discount

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

        // For guests, just update the configuration
        const config = await prisma.configuration.findUnique({
            where: { id: configId },
            include: {
                users: true
            }
        })

        if (!config) {
            throw new Error("Configuration not found")
        }

        const newTotalPrice = (config.configPrice * quantity) - config.discount

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
        throw new Error("Failed to update configuration quantity")
    }
}

// Helper function to associate a configuration with a user (when they sign in)
export async function associateConfigurationWithUser(configId: string, userId: string) {
    try {
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: { users: true },
        })

        if (!configuration) {
            throw new Error("Configuration not found")
        }

        // If configuration already has users, don't override
        if (configuration.users.length > 0) {
            return { success: false, message: "Configuration already has an owner" }
        }

        // Ensure user exists
        let user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            user = await prisma.user.create({
                data: { id: userId },
            })
        }

        // Associate configuration with user
        await prisma.configuration.update({
            where: { id: configId },
            data: {
                users: {
                    connect: { id: userId },
                },
            },
        })

        return { success: true, message: "Configuration associated with user" }
    } catch (error) {
        console.error("Failed to associate configuration with user:", error)
        throw new Error("Failed to associate configuration with user")
    }
}