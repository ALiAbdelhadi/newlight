import { Prisma, type SerializedMoney } from "@repo/database";
import type { ProductDetailView } from "@/lib/services/product-service";

/**
 * §14.1: one Locale type for the whole app. `SupportedLanguage` is kept as an alias so the
 * existing call sites do not churn, but the definition lives in @repo/database, which is what
 * next-intl's routing, the seed and every query now share.
 */
export type { Locale } from "@repo/database";

export type SupportedLanguage = import("@repo/database").Locale

export interface PagePropsTypes {
    params: Promise<{
        locale: string;
        ProductId?: string;
        projectId?: string;
        subCategory?: string;
        lightingType?: string;
        orderId?: string;
    }>,
    searchParams?: Promise<{
        [key: string]: string | string[] | undefined
    }>
}

export interface LanguageSwitcherProps {
    currentLocale: string
}

/**
 * A cart row as `/api/cart` sends it.
 *
 * The money fields are STRINGS. They always were on the wire — the API serialises Decimals
 * (ADR 0001) — but this interface declared them `number`, so the sidebar was doing
 * `item.price * quantity` on a string and getting away with it through JavaScript's coercion.
 * Declaring what is actually sent is what lets the arithmetic go through the money helpers.
 *
 * `discount` (a percentage) is gone with it: a discount is resolved server-side now (§13.2),
 * so the client is told the price and the price before it, not a rule for computing one from
 * the other.
 */
export interface CartItem {
    id: string
    productId: string
    productName: string
    productImages: string[]
    /** What the customer pays per unit — discounted where a discount is live. */
    price: SerializedMoney
    /** The undiscounted unit price. Equal to `price` when nothing is on offer. */
    basePrice: SerializedMoney
    discountPercent: number
    quantity: number
    subCategory: string
    category: string
    categorySlug: string
    selectedColorTemp: string | null
    selectedColorKey: string | null
    /** `price × quantity`, computed on the server. */
    totalPrice: SerializedMoney
    colorTemperatures: string[]
    availableColors: string[]
}

export interface LanguageSwitcherProps {
    currentLocale: string
}

export interface Language {
    code: "en" | "ar"
    name: string
    nativeName: string
    region: string
}


export enum ProductColorTemp {
    warm = "warm",
    cool = "cool",
    white = "white",
}

export interface ProductVariant {
    id: string
    productId: string
    slug: string
    variantType: string | null
    variantValue: string | null
    price: number
    inventory: number
    images: string[]
    name: string
    isActive: boolean
    isFeatured: boolean
    colorImageMap: Record<string, string[]> | null
    availableColors: string[]
}

export type Product = {
    id: string
    productId: string
    slug: string
    price: number
    inventory: number
    images: string[]
    voltage: string | null
    maxWattage: number | null
    brandOfLed: string | null
    luminousFlux: string | null
    mainMaterial: string | null
    lightingType: string | null
    driver: string | null
    cri: string | null
    beamAngle: number | null
    productDimensions: string | null
    holeSize: string | null
    powerFactor: string | null
    colorTemperatures: string[]
    ipRating: string | null
    maxIpRating: string | null
    lifeTime: number | null
    availableColors: string[]
    baseProductId: string | null
    variantType: string | null
    variantValue: string | null
    displayOrder: number
    colorImageMap: Record<string, string[]> | null
    variants?: ProductVariant[]
    specifications?: Record<string, string | number | string[]> | null
    isActive: boolean
    isFeatured: boolean
    translations: Array<{
        locale: string
        name: string
        description: string | null
    }>
    subCategory: {
        id: string
        slug: string
        translations: Array<{
            locale: string
            name: string
            description: string | null
        }>
        category: {
            id: string
            slug: string
            categoryType: "indoor" | "outdoor"
            translations: Array<{
                locale: string
                name: string
                description: string | null
            }>
        }
    }
}

export interface ProductTranslation {
    name: string
    description: string | null
    specifications: unknown
}

export interface SubCategoryTranslation {
    name: string
}

export interface CategoryTranslation {
    name: string
}

export interface PreviewClientProps {
    configId: string
    /** Whatever ProductService.getProductBySlug returns — derived, not re-declared. */
    product: ProductDetailView
    configuration: {
        selectedColorTemp?: string | null
        selectedColorKey?: string | null
        quantity: number
        /** Serialised money (ADR 0001). `discount` is gone: 0.00 on every row (A21). */
        totalPrice: SerializedMoney
    }
    translations: {
        home: string
        orderPreview: string
        reviewOrder: string
        reviewDescription: string
        noImage: string
        keySpecs: string
        orderSummary: string
        colorTemperature: string
        surfaceColor: string
        quantity: string
        unitPrice: string
        subtotal: string
        discount: string
        total: string
        currency: string
        proceedToCheckout: string
        secureCheckout: string
    }
    locale: string
}

export interface ShippingAddress {
    fullName: string
    phone: string
    email?: string
    addressLine1: string
    addressLine2?: string
    city: string
    state?: string
    postalCode: string
    country: string
}

export interface OrderItem {
    id: string
    productName: string
    productImage: string
    price: number
    quantity: number
    selectedColorTemp?: string
    selectedColorKey?: string
}

/**
 * The order-confirmation page's copy.
 *
 * `orderPlaced`, `processing` and `estimatedDelivery` are gone with the fake two-step timeline
 * they fed — the real one takes its labels from `@repo/database/status`. `each` and `currency`
 * went with the hand-rolled money rendering in OrderItemsList.
 *
 * This interface was DECLARED TWICE in this file, and TypeScript merged the two declarations
 * silently, so removing a field from one had no effect at all.
 */
export interface CompleteTranslations {
    orderConfirmed: string
    thankYou: string
    orderNumber: string
    orderItems: string
    colorTemp: string
    color: string
    quantity: string
    shippingAddress: string
    shippingMethod: string
    paymentSummary: string
    subtotal: string
    shipping: string
    total: string
    viewOrderDetails: string
    continueShopping: string
}

export interface OrderSuccessHeaderTranslations {
    orderConfirmed: string
    thankYou: string
    orderNumber: string
}

export interface OrderStatusTimelineTranslations {
    orderPlaced: string
    processing: string
    estimatedDelivery: string
}

export interface OrderItemsListTranslations {
    orderItems: string
    colorTemp: string
    color: string
    quantity: string
    each: string
    currency: string
}

export interface OrderShippingInfoTranslations {
    shippingAddress: string
    shippingMethod: string
}

export interface OrderPaymentSummaryTranslations {
    paymentSummary: string
    subtotal: string
    shipping: string
    total: string
    currency: string
}

export interface OrderActionsTranslations {
    viewOrderDetails: string
    continueShopping: string
}

export type OrderWithDetails = Prisma.OrderGetPayload<{
    include: {
        items: {
            include: {
                product: {
                    include: {
                        translations: true
                    }
                }
                configuration: true
            }
        }
        shippingAddress: true
        configuration: true
    }
}>


export type OrderItemWithRelations = Prisma.OrderItemGetPayload<{
    include: {
        product: {
            include: {
                translations: true
            }
        }
        configuration: true
    }
}>

export interface ConfirmPageViewProps {
    configId: string
    userId: string
    /**
     * What each shipping option costs, read from the `shipping.rate.*` settings the panel
     * writes. Passed in rather than looked up here: the price a customer is SHOWN and the
     * price the order is CHARGED must come from one source (see `shipping-service.ts`).
     */
    shippingRates: Record<ShippingOption, SerializedMoney>
    configuration: {
        quantity: number
        totalPrice: SerializedMoney
        selectedColorTemp?: string | null
        selectedColorKey?: string | null
    }
    product: ProductDetailView
    productName: string
    existingAddress?: ShippingAddress
    translations: {
        home: string
        orderPreview: string
        confirmOrder: string
        confirmYourOrder: string
        confirmDescription: string
        orderSummary: string
        quantity: string
        subtotal: string
        shipping: string
        calculatedAtCheckout: string
        currency: string
        shippingInformation: string
        fullName: string
        phone: string
        email: string
        addressLine1: string
        addressLine2: string
        city: string
        state: string
        postalCode: string
        shippingOption: string
        basicShipping: string
        standardShipping: string
        expressShipping: string
        saveAndContinue: string
        fullNamePlaceholder: string
        phonePlaceholder: string
        emailPlaceholder: string
        addressPlaceholder: string
        cityPlaceholder: string
        statePlaceholder: string
        postalCodePlaceholder: string
    }
    isArabic: boolean
}
export interface ConfirmFormProps {
    configId: string
    userId: string
    /**
     * What each shipping option costs, read from the `shipping.rate.*` settings the panel
     * writes. Passed in rather than looked up here: the price a customer is SHOWN and the
     * price the order is CHARGED must come from one source (see `shipping-service.ts`).
     */
    shippingRates: Record<ShippingOption, SerializedMoney>
    existingAddress?: {
        fullName: string
        phone: string
        email?: string
        addressLine1: string
        addressLine2?: string
        city: string
        state?: string
        postalCode: string
        country: string
    }
    translations: {
        shippingInformation: string
        fullName: string
        phone: string
        email: string
        addressLine1: string
        addressLine2: string
        city: string
        state: string
        postalCode: string
        shippingOption: string
        basicShipping: string
        standardShipping: string
        expressShipping: string
        saveAndContinue: string
        fullNamePlaceholder: string
        phonePlaceholder: string
        emailPlaceholder: string
        addressPlaceholder: string
        cityPlaceholder: string
        statePlaceholder: string
        postalCodePlaceholder: string
    }
    isArabic: boolean
}

export type ShippingOption = "BasicShipping" | "StandardShipping" | "ExpressShipping"
export interface OrderSummaryProps {
    product: {
        productId: string
        price: SerializedMoney
        images: Array<{ url: string }>
    }
    productName: string
    configuration: {
        quantity: number
        totalPrice: SerializedMoney
    }
    translations: {
        orderSummary: string
        quantity: string
        subtotal: string
        shipping: string
        calculatedAtCheckout: string
        currency: string
    }
}

export type Category = {
    id: string
    categoryType: "indoor" | "outdoor"
    slug: string
    imageUrl: string | null
    translations: Array<{
        locale: string
        name: string
        description: string | null
    }>
    subCategories: Array<{
        id: string
        slug: string
        imageUrl: string | null
        translations: Array<{
            locale: string
            name: string
            description: string | null
        }>
        _count: {
            products: number
        }
    }>
}

export type SubCategory = {
    id: string
    slug: string
    imageUrl: string | null
    translations: Array<{
        locale: string
        name: string
        description: string | null
    }>
    category: {
        id: string
        slug: string
        categoryType: "indoor" | "outdoor"
        translations: Array<{
            locale: string
            name: string
            description: string | null
        }>
    }
    products: Array<{
        id: string
        productId: string
        slug: string
        price: number
        images: string[]
        isFeatured: boolean
        baseProductId: string | null
        variantType: string | null
        variantValue: string | null
        colorImageMap: Record<string, string[]> | null
        translations: Array<{
            locale: string
            name: string
            description: string | null
        }>
    }>
}