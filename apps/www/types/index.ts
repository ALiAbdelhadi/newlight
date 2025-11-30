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
    quantity: number
    productImages: string[]
    discount: number
    price: number
    brand: string
    sectionType: string
    spotlightType: string
    totalPrice: number
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
