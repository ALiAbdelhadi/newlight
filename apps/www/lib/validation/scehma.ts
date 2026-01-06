import { z } from "zod"

/**
 * Order Creation Schema
 */
export const createOrderSchema = z.object({
    configurationId: z.string().min(1, "Configuration ID is required"),
    shippingAddressId: z.string().min(1, "Shipping address ID is required"),
    shippingOption: z
        .enum(["BasicShipping", "StandardShipping", "ExpressShipping"])
        .default("StandardShipping"),
    idempotencyKey: z.string().optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

/**
 * Cart Item Schema
 */
export const addToCartSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
    selectedColorTemp: z.string().optional(),
    selectedColor: z.string().optional(),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>

/**
 * Update Cart Item Schema
 */
export const updateCartItemSchema = z.object({
    itemId: z.string().min(1, "Item ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
})

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>

/**
 * Remove Cart Item Schema
 */
export const removeCartItemSchema = z.object({
    itemId: z.string().min(1, "Item ID is required"),
})

export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>

/**
 * Shipping Address Schema
 */
export const shippingAddressSchema = z.object({
    fullName: z.string().regex(/^[\u0621-\u064Aa-zA-Z\s]+$/).min(2, "Full name must be at least 2 characters"),
    phone: z.string().regex(/^[\+]?[0-9]{10,15}$/).min(10, "Phone number must be at least 10 characters"),
    email: z.string().email("Invalid email address").optional(),
    addressLine1: z.string().min(5, "Address must be at least 5 characters"),
    addressLine2: z.string().optional(),
    city: z.string().min(2, "City must be at least 2 characters"),
    state: z.string().optional(),
    postalCode: z.string().min(3, "Postal code must be at least 3 characters"),
    country: z.string().default("Egypt"),
})

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>

/**
 * Configuration Schema
 */
export const saveConfigurationSchema = z.object({
    productId: z.string().min(1, "Product ID is required").max(1000),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    selectedColorTemp: z.enum(['WARM_3000K', 'COOL_4000K', 'WHITE_6500K']).optional(),
    selectedColor: z.enum(['BLACK', 'GRAY', 'WHITE', 'GOLD', 'WOOD']).optional(),
    configId: z.string().optional(),
})

export type SaveConfigurationInput = z.infer<typeof saveConfigurationSchema>

/**
 * Update Configuration Quantity Schema
 */
export const updateConfigurationQuantitySchema = z.object({
    configId: z.string().min(1, "Configuration ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
})

export type UpdateConfigurationQuantityInput = z.infer<typeof updateConfigurationQuantitySchema>

/**
 * Order Status Update Schema
 */
export const updateOrderStatusSchema = z.object({
    status: z.enum([
        "awaiting_shipment",
        "processing",
        "shipped",
        "delivered",
        "fulfilled",
        "cancelled",
        "refunded",
    ]),
    trackingNumber: z.string().optional(),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

/**
 * Order Query Schema
 */
export const orderQuerySchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    status: z
        .enum([
            "awaiting_shipment",
            "processing",
            "shipped",
            "delivered",
            "fulfilled",
            "cancelled",
            "refunded",
        ])
        .optional(),
})

export type OrderQueryInput = z.infer<typeof orderQuerySchema>