"use server"

import { currentAdminId } from "@/lib/auth"
import { prisma , multiplyMoney } from "@repo/database"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

interface SaveConfigurationArgs {
    productId: string
    quantity: number
    selectedColorTemp?: string
    selectedColorKey?: string
    configId?: string
}

export async function saveConfiguration(args: SaveConfigurationArgs) {
    // Get userId but don't require it for saveConfiguration
    const userId = await currentAdminId()

    try {
        // Get product details
        const product = await prisma.product.findUnique({
            where: { productId: args.productId },
            include: {
                // English by design, not by accident: the admin app has no i18n (§14).
                // Every other `take: 1` in this app was an unscoped read and is fixed.
                translations: { where: { locale: "en" }, take: 1 },
            },
        })

        if (!product) {
            throw new Error("Product not found")
        }

        // If user is logged in, try to update existing config
        if (userId) {
            // The lazy-create is gone (§7): a caller with an authenticated userId has a row.

            if (args.configId) {
                const existingConfig = await prisma.productConfiguration.findFirst({
                    where: {
                        id: args.configId,
                        users: {
                            some: { id: userId },
                        },
                    },
                })

                if (existingConfig) {
                    const updatedConfig = await prisma.productConfiguration.update({
                        where: { id: args.configId },
                        data: {
                            quantity: args.quantity,
                            totalPrice: multiplyMoney(product.price, args.quantity),
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
            const configuration = await prisma.productConfiguration.create({
                data: {
                    productId: product.id,
                    productSku: product.productId,
                    configPrice: product.price,
                    quantity: args.quantity,
                    totalPrice: multiplyMoney(product.price, args.quantity),
                    currency: "EGP",
                    selectedColorTemp: args.selectedColorTemp,
                    selectedColorKey: args.selectedColorKey,
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
        const configuration = await prisma.productConfiguration.create({
            data: {
                productId: product.id,
                productSku: product.productId,
                configPrice: product.price,
                quantity: args.quantity,
                totalPrice: multiplyMoney(product.price, args.quantity),
                currency: "EGP",
                selectedColorTemp: args.selectedColorTemp,
                selectedColorKey: args.selectedColorKey,
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
    const userId = await currentAdminId()

    // Allow getting configuration without authentication
    try {
        // If user is logged in, check if config belongs to them
        if (userId) {
            const configuration = await prisma.productConfiguration.findFirst({
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

                return {
                    ...configuration,
                    selectedColorTemp: configuration.selectedColorTemp,
                    selectedColorKey: configuration.selectedColorKey,
                }
            }
        }

        // For guests or if not found with user, try to get config without user check
        const configuration = await prisma.productConfiguration.findUnique({
            where: { id: configId },
            include: {
                users: true,
            },
        })

        if (!configuration) {
            return null
        }

        // Parse the stored value

        return {
            ...configuration,
            selectedColorTemp: configuration.selectedColorTemp,
            selectedColorKey: configuration.selectedColorKey,
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
    const userId = await currentAdminId()

    if (quantity < 1) {
        throw new Error("Invalid quantity")
    }

    try {
        // If user is logged in, verify ownership
        if (userId) {
            const config = await prisma.productConfiguration.findFirst({
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
                // `discount` is dropped (A21): 0.00 on all 13 production rows, never written otherwise.
                const newTotalPrice = multiplyMoney(config.configPrice, quantity)

                const updatedConfig = await prisma.productConfiguration.update({
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
        const config = await prisma.productConfiguration.findUnique({
            where: { id: configId },
            include: {
                users: true
            }
        })

        if (!config) {
            throw new Error("Configuration not found")
        }

        // `discount` is dropped (A21): 0.00 on all 13 production rows, never written otherwise.
                const newTotalPrice = multiplyMoney(config.configPrice, quantity)

        const updatedConfig = await prisma.productConfiguration.update({
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
        const configuration = await prisma.productConfiguration.findUnique({
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

            // The lazy-create is gone (§7): a caller with an authenticated userId has a row.

        // Associate configuration with user
        await prisma.productConfiguration.update({
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