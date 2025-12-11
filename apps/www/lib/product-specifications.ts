/**
 * Helper functions for product specifications
 * This file handles the logic for formatting and displaying product specifications
 * Values are retrieved directly from database as-is (already translated)
 */


export type ProductSpec = {
    label: string
    value: string | number | null
    formattedValue: string | number | null
}

type ProductSpecificationsInput = {
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
    ipRating: string | null
    maxIpRating: string | null
    lifeTime: number | null
    colorTemperatures: string[]
    availableColors: string[]
}

type TranslationFunction = (key: string, params?: Record<string, string | number>) => string

/**
 * Get product specifications with translated labels
 * Values are taken directly from database (already translated)
 * Filters out empty/null values automatically
 * If locale is not provided, it will be fetched automatically from next-intl
 */
export function getProductSpecifications(
    product: ProductSpecificationsInput,
    t: TranslationFunction,
    locale: string = "en"
): ProductSpec[] {
    // Locale should be provided from client component using useLocale() hook
    const resolvedLocale = locale || "en"
    const specifications: ProductSpec[] = []

    const labels = {
        ar: {
            voltage: "المدخل",
            maxWattage: "أقصى قوة كهربائية (W)",
            brandOfLed: "علامة الليد التجارية",
            luminousFlux: "اللومن",
            mainMaterial: "مادة التصنيع",
            cri: "مؤشر تجسيد الألوان (CRI)",
            beamAngle: "زاوية الإضاءة°",
            productDimensions: "أبعاد المنتج",
            holeSize: "حجم الفتحة",
            powerFactor: "معامل القدرة",
            ipRating: "درجة الحماية",
            maxIpRating: "أقصى درجة حماية",
            lifeTime: "العمر الافتراضي",
            hours: "ساعات",
        },
        en: {
            voltage: "Input",
            maxWattage: "Maximum wattage",
            brandOfLed: "Brand of LED",
            luminousFlux: "Luminous Flux",
            mainMaterial: "Main Material",
            cri: "CRI",
            beamAngle: "Beam Angle",
            productDimensions: "Product Dimensions",
            holeSize: "Hole Size",
            powerFactor: "Power Factor",
            ipRating: "IP Rating",
            maxIpRating: "Max IP Rating",
            lifeTime: "Life Time",
            hours: "Hours",
        },
    } as const

    const L = labels[resolvedLocale as keyof typeof labels] || labels.en

    const safeLabel = (key: keyof typeof L, fallbackKey: string) => L[key] || t(fallbackKey)

    // Voltage - get value directly from DB as-is
    if (product.voltage) {
        specifications.push({
            label: safeLabel("voltage", "voltage"),
            value: product.voltage,
            formattedValue: product.voltage,
        })
    }

    // Max Wattage - get value directly from DB as-is
    if (product.maxWattage) {
        specifications.push({
            label: safeLabel("maxWattage", "maxWattage"),
            value: product.maxWattage,
            formattedValue: `${product.maxWattage}W`,
        })
    }

    // Brand of LED - get value directly from DB as-is
    if (product.brandOfLed) {
        specifications.push({
            label: safeLabel("brandOfLed", "brandOfLed"),
            value: product.brandOfLed,
            formattedValue: product.brandOfLed,
        })
    }

    // Luminous Flux - get value directly from DB as-is
    if (product.luminousFlux) {
        specifications.push({
            label: safeLabel("luminousFlux", "luminousFlux"),
            value: product.luminousFlux,
            formattedValue: product.luminousFlux,
        })
    }

    // Main Material - get value directly from DB as-is
    if (product.mainMaterial) {
        specifications.push({
            label: safeLabel("mainMaterial", "mainMaterial"),
            value: product.mainMaterial,
            formattedValue: product.mainMaterial,
        })
    }

    // CRI - get value directly from DB as-is
    if (product.cri) {
        specifications.push({
            label: safeLabel("cri", "cri"),
            value: product.cri,
            formattedValue: product.cri,
        })
    }

    // Beam Angle - get value directly from DB as-is
    if (product.beamAngle) {
        specifications.push({
            label: safeLabel("beamAngle", "beamAngle"),
            value: product.beamAngle,
            formattedValue: `${product.beamAngle}°`,
        })
    }

    // Product Dimensions - get value directly from DB as-is
    if (product.productDimensions) {
        specifications.push({
            label: safeLabel("productDimensions", "productDimensions"),
            value: product.productDimensions,
            formattedValue: product.productDimensions,
        })
    }

    // Hole Size - get value directly from DB as-is
    if (product.holeSize) {
        specifications.push({
            label: safeLabel("holeSize", "holeSize"),
            value: product.holeSize,
            formattedValue: product.holeSize,
        })
    }

    // Power Factor - get value directly from DB as-is
    if (product.powerFactor) {
        specifications.push({
            label: safeLabel("powerFactor", "powerFactor"),
            value: product.powerFactor,
            formattedValue: product.powerFactor,
        })
    }

    // IP Rating - get value directly from DB as-is
    if (product.ipRating) {
        specifications.push({
            label: safeLabel("ipRating", "ipRating"),
            value: product.ipRating,
            formattedValue: product.ipRating,
        })
    }

    // Max IP Rating - get value directly from DB as-is
    if (product.maxIpRating) {
        specifications.push({
            label: safeLabel("maxIpRating", "maxIpRating"),
            value: product.maxIpRating,
            formattedValue: product.maxIpRating,
        })
    }

    // Life Time - get value directly from DB as-is
    if (product.lifeTime) {
        const hoursLabel = safeLabel("hours", "hours")
        specifications.push({
            label: safeLabel("lifeTime", "lifeTime"),
            value: product.lifeTime,
            formattedValue: `${product.lifeTime.toLocaleString(resolvedLocale === "ar" ? "ar-EG" : "en-US")} ${hoursLabel}`,
        })
    }

    return specifications
}

/**
 * Get color temperatures as formatted strings
 * Values are taken directly from DB as-is (already translated)
 */
export function getColorTemperatures(
    colorTemperatures: string[]
): string[] {
    // Return values directly from DB, just format enum-like values to readable format
    return colorTemperatures.map((temp) => {
        return temp
            .replace(/_/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim()
    })
}

/**
 * Format available colors
 * Values are taken directly from DB as-is (already translated)
 */
export function formatAvailableColors(
    colors: string[]
): string[] {
    // Return values directly from DB as-is
    return colors
}