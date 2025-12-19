import { Prisma } from "@repo/database";

export type SupportedLanguage = "en" | "ar"

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

export interface CartItem {
    id: string
    productId: string
    productName: string
    productImages: string[]
    price: number
    quantity: number
    discount: number
    subCategory: string
    category: string
    categoryType: string
    selectedColorTemp: string | null
    selectedColor: string | null
    totalPrice: number
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
        }>
        category: {
            id: string
            slug: string
            categoryType: "indoor" | "outdoor"
            translations: Array<{
                locale: string
                name: string
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
    product: {
        productId: string
        price: number
        images: string[]
        translations: ProductTranslation[]
        subCategory: {
            slug: string
            translations: SubCategoryTranslation[]
            category: {
                slug: string
                categoryType: string
                translations: CategoryTranslation[]
            }
        }
    }
    configuration: {
        selectedColorTemp?: string | null
        selectedColor?: string | null
        quantity: number
        discount: number
        totalPrice: number
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
    selectedColor?: string
}

export interface CompleteTranslations {
    orderConfirmed: string
    thankYou: string
    orderNumber: string
    orderPlaced: string
    processing: string
    estimatedDelivery: string
    orderItems: string
    colorTemp: string
    color: string
    quantity: string
    each: string
    currency: string
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

export interface CompleteTranslations {
    orderConfirmed: string
    thankYou: string
    orderNumber: string
    orderPlaced: string
    processing: string
    estimatedDelivery: string
    orderItems: string
    colorTemp: string
    color: string
    quantity: string
    each: string
    currency: string
    shippingAddress: string
    shippingMethod: string
    paymentSummary: string
    subtotal: string
    shipping: string
    total: string
    viewOrderDetails: string
    continueShopping: string
}

export interface ConfirmPageViewProps {
    configId: string
    userId: string
    configuration: {
        quantity: number
        totalPrice: number
        selectedColorTemp?: string | null
        selectedColor?: string | null
    }
    product: {
        productId: string
        price: number
        images: string[]
        translations: Array<{
            name: string
            description?: string | null
        }>
        subCategory: {
            slug: string
            translations: Array<{
                name: string
            }>
            category: {
                slug: string
                categoryType: string
                translations: Array<{
                    name: string
                }>
            }
        }
    }
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

export interface OrderSummaryProps {
    product: {
        productId: string
        price: number
        images: string[]
    }
    productName: string
    configuration: {
        quantity: number
        totalPrice: number
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