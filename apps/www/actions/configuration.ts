"use server"

import { currentUserId } from "@/lib/auth"
import { multiplyMoney, prisma } from "@repo/database"
import { revalidatePath } from "next/cache"

interface SaveConfigurationArgs {
    productId: string
    quantity: number
    selectedColorTemp?: string
    selectedColorKey?: string
    configId?: string
}

async function safeRevalidatePath(path: string): Promise<boolean> {
    try {
        revalidatePath(path)
        return true
    } catch (error) {
        console.error(`Failed to revalidate path: ${path}`, error)
        return false
    }
}

export async function saveConfiguration(args: SaveConfigurationArgs) {
    try {
        const userId = await currentUserId()

        // args.productId is the SKU the storefront routes on. A21/Q4 made
        // ProductConfiguration.productId a REAL foreign key with a denormalised productSku
        // beside it — in v1 the column was called productId and held a SKU, so the relation
        // resolved for zero of the 13 production rows.
        const product = await prisma.product.findFirst({
            where: { productId: args.productId, isActive: true, deletedAt: null },
            select: { id: true, productId: true, price: true },
        })

        if (!product) {
            return {
                success: false,
                error: "Product not found",
            }
        }

        const lineTotal = multiplyMoney(product.price, args.quantity)

        if (userId) {

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
                            totalPrice: lineTotal,
                            selectedColorTemp: args.selectedColorTemp,
                            selectedColorKey: args.selectedColorKey,
                        },
                    })

                    const revalidated = await safeRevalidatePath(`/preview/${args.configId}`)

                    return {
                        success: true,
                        configId: updatedConfig.id,
                        productId: args.productId,
                        cacheCleared: revalidated,
                    }
                }
            }

            const configuration = await prisma.productConfiguration.create({
                data: {
                    productId: product.id,
                    productSku: product.productId,
                    configPrice: product.price,
                    quantity: args.quantity,
                    totalPrice: lineTotal,
                    currency: "EGP",
                    selectedColorTemp: args.selectedColorTemp,
                    selectedColorKey: args.selectedColorKey,
                    users: {
                        connect: { id: userId },
                    },
                },
            })

            const revalidated = await safeRevalidatePath(`/preview/${configuration.id}`)

            return {
                success: true,
                configId: configuration.id,
                productId: args.productId,
                cacheCleared: revalidated,
            }
        }

        const configuration = await prisma.productConfiguration.create({
            data: {
                productId: product.id,
                productSku: product.productId,
                configPrice: product.price,
                quantity: args.quantity,
                totalPrice: lineTotal,
                currency: "EGP",
                selectedColorTemp: args.selectedColorTemp,
                selectedColorKey: args.selectedColorKey,
            },
        })

        const revalidated = await safeRevalidatePath(`/preview/${configuration.id}`)

        return {
            success: true,
            configId: configuration.id,
            productId: args.productId,
            cacheCleared: revalidated,
        }

    } catch (error) {
        console.error("Failed to save configuration:", error)

        return {
            success: false,
            error: "Failed to save configuration",
        }
    }
}

export async function getConfiguration(configId: string) {
    try {
        const userId = await currentUserId()

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

            // The `value` JSON blob is gone (0010). It duplicated selectedColorTemp and
            // selectedColorKey, which are real columns — and it was read FIRST, so a stale
            // copy could override the column it was copied from.
            if (configuration) {
                return configuration
            }
        }

        const configuration = await prisma.productConfiguration.findUnique({
            where: { id: configId },
            include: {
                users: true,
            },
        })

        if (!configuration) {
            return null
        }

        return configuration

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
    try {
        const userId = await currentUserId()

        if (quantity < 1) {
            return {
                success: false,
                error: "Invalid quantity",
            }
        }

        if (userId) {
            const config = await prisma.productConfiguration.findFirst({
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
                const newTotalPrice = multiplyMoney(config.configPrice, quantity)

                const updatedConfig = await prisma.productConfiguration.update({
                    where: { id: configId },
                    data: {
                        quantity,
                        totalPrice: newTotalPrice,
                    },
                })

                const revalidated = await safeRevalidatePath(`/preview/${configId}`)

                return {
                    success: true,
                    configuration: updatedConfig,
                    cacheCleared: revalidated,
                }
            }
        }

        const config = await prisma.productConfiguration.findUnique({
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

        const newTotalPrice = multiplyMoney(config.configPrice, quantity)

        const updatedConfig = await prisma.productConfiguration.update({
            where: { id: configId },
            data: {
                quantity,
                totalPrice: newTotalPrice,
            },
        })

        const revalidated = await safeRevalidatePath(`/preview/${configId}`)

        return {
            success: true,
            configuration: updatedConfig,
            cacheCleared: revalidated,
        }

    } catch (error) {
        console.error("Failed to update configuration quantity:", error)

        return {
            success: false,
            error: "Failed to update configuration quantity",
        }
    }
}

export async function associateConfigurationWithUser(configId: string, userId: string) {
    try {
        const configuration = await prisma.productConfiguration.findUnique({
            where: { id: configId },
            include: { users: true },
        })

        if (!configuration) {
            return {
                success: false,
                error: "Configuration not found",
            }
        }

        if (configuration.users.length > 0) {
            return {
                success: false,
                error: "Configuration already has an owner",
            }
        }


        await prisma.productConfiguration.update({
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