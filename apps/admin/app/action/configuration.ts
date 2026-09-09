"use server"

import { currentAdminId } from "@/lib/auth"
import { prisma , multiplyMoney } from "@repo/database"
import { revalidatePath } from "next/cache"

interface SaveConfigurationArgs {
    productId: string
    quantity: number
    selectedColorTemp?: string
    selectedColorKey?: string
    configId?: string
}

export async function saveConfiguration(args: SaveConfigurationArgs) {
    const userId = await currentAdminId()

    try {
        const product = await prisma.product.findUnique({
            where: { productId: args.productId },
            include: {
                translations: { where: { locale: "en" }, take: 1 },
            },
        })

        if (!product) {
            throw new Error("Product not found")
        }

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

    try {
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

                return {
                    ...configuration,
                    selectedColorTemp: configuration.selectedColorTemp,
                    selectedColorKey: configuration.selectedColorKey,
                }
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

        const config = await prisma.productConfiguration.findUnique({
            where: { id: configId },
            include: {
                users: true
            }
        })

        if (!config) {
            throw new Error("Configuration not found")
        }

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

export async function associateConfigurationWithUser(configId: string, userId: string) {
    try {
        const configuration = await prisma.productConfiguration.findUnique({
            where: { id: configId },
            include: { users: true },
        })

        if (!configuration) {
            throw new Error("Configuration not found")
        }

        if (configuration.users.length > 0) {
            return { success: false, message: "Configuration already has an owner" }
        }

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