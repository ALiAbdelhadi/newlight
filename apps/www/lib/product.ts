/**
 * Product utility functions for formatting and localization
 */

/**
 * Format available color names with Arabic/English translations
 */
export const formatAvailableColor = (color: string, isArabic: boolean): string => {
    const map: Record<string, string> = {
        BLACK: isArabic ? "أسود" : "Black",
        GRAY: isArabic ? "رمادي" : "Gray",
        WHITE: isArabic ? "أبيض" : "White",
        GOLD: isArabic ? "ذهبي" : "Gold",
        WOOD: isArabic ? "خشبي" : "Wood",
    }
    return map[color] || color.replace(/_/g, " ")
}

/**
 * Format specification labels with proper capitalization
 */
export const formatLabel = (label: string, isArabic: boolean): string => {
    if (isArabic) {
        return label
    }
    const lowerLabel = label.toLowerCase()
    if (lowerLabel === "ip" || lowerLabel === "ip_rating" || lowerLabel === "iprating") {
        return "IP"
    }
    if (lowerLabel === "maxip" || lowerLabel === "max_ip" || lowerLabel === "maxiprating") {
        return "Max IP"
    }
    return label
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
        .trim()
}

/**
 * Format color temperatures with translations
 */
export const formatColorTemps = (temps: string[], isArabic: boolean): string => {
    const map: Record<string, string> = {
        WARM_3000K: isArabic ? "دافئ 3000K" : "Warm 3000K",
        COOL_4000K: isArabic ? "بارد 4000K" : "Cool 4000K",
        WHITE_6500K: isArabic ? "أبيض 6500K" : "White 6500K",
    }
    const joiner = isArabic ? " / " : " / "
    return temps.map((temp) => map[temp] || temp.replace(/_/g, " ").toLowerCase()).join(joiner)
}

/**
 * Create number formatter based on locale
 */
export const createNumberFormatter = (locale: string) => {
    return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        ...(locale.startsWith("ar") ? { numberingSystem: "arab" } : {}),
    })
}

/**
 * Format number with locale support
 */
export const formatNumber = (value: number | string, formatter: Intl.NumberFormat): string => {
    const num = typeof value === "number" ? value : Number(value)
    if (Number.isFinite(num)) return formatter.format(num)
    return value.toString()
}

/**
 * Format specification values with units and translations
 */
export const formatValue = (
    label: string,
    value: string | number | string[],
    locale: string,
    formatter: Intl.NumberFormat
): string => {
    if (value === null || value === undefined || value === "") return ""

    const isArabic = locale.startsWith("ar")
    const joiner = isArabic ? " ، " : ", "

    if (Array.isArray(value)) {
        const normalizedLabel = label.toLowerCase()

        if (
            ["surface_color", "لون السطح", "available_colors", "الالوان المتوفرة", "color"].some((l) =>
                normalizedLabel.includes(l.toLowerCase())
            )
        ) {
            return value.map(color => formatAvailableColor(color, isArabic)).join(joiner)
        }
        return value.map((v) => `${formatNumber(v, formatter)}K`).join(joiner)
    }

    const normalizedLabel = label.toLowerCase()

    if (
        ["surface_color", "لون السطح", "available_colors", "الالوان المتوفرة"].some((l) =>
            normalizedLabel.includes(l.toLowerCase())
        )
    ) {
        return formatAvailableColor(value.toString(), isArabic)
    }

    if (["أقصى قوة كهربائية", "maximum_wattage", "wattage"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
        const unit = isArabic ? "وات" : "W"
        return `${formatNumber(value, formatter)} ${unit}`
    }

    if (["درجة الحماية القصوي", "maxip", "max_ip"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
        return formatNumber(value, formatter)
    }

    if (["درجة حرارة اللون", "color_temperature"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
        return value.toString()
    }

    if (["اللومن", "luminous_flux", "luminous flux"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
        const unit = isArabic ? "لومن" : "lm"
        return `${formatNumber(value, formatter)} ${unit}`
    }

    if (["العمر الافتراضي", "life_time", "lifetime"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
        const unit = isArabic ? "ساعة" : "hours"
        return `${formatNumber(value, formatter)} ${unit}`
    }

    if (["زاوية الإضاءة", "beam_angle"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
        return `${formatNumber(value, formatter)}°`
    }

    if (["توفير الطاقة", "energy_saving"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
        return `${formatNumber(value, formatter)}%`
    }

    return value.toString()
}

/**
 * Preferred order for specifications display
 */
export const PREFERRED_SPEC_ORDER = [
    "input",
    "المدخل",
    "voltage",
    "الفولت",
    "maximum_wattage",
    "أقصى قوة كهربائية",
    "brand_of_led",
    "علامة الليد التجارية",
    "luminous_flux",
    "اللومن",
    "main_material",
    "مادة التصنيع",
    "cri",
    "مؤشر تجسيد الألوان",
    "beam_angle",
    "زاوية الإضاءة",
    "working_temperature",
    "درجة حرارة التشغيل",
    "fixture_dimmable",
    "قابل للتعتيم",
    "electrical",
    "الكهرباء",
    "driver",
    "المحرك",
    "power_factor",
    "معامل القدرة",
    "color_temperature",
    "درجة حرارة اللون",
    "ip_rating",
    "درجة الحماية",
    "ip",
    "maxip",
    "أقصى درجة حماية",
    "energy_saving",
    "توفير الطاقة",
    "life_time",
    "العمر الافتراضي",
    "product_dimensions",
    "أبعاد المنتج",
    "hole_size",
    "حجم الفتحة",
    "surface_color",
    "لون السطح",
    "available_colors",
    "الالوان المتوفرة",
] as const

/**
 * Normalize key for comparison
 */
export const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/\s+/g, "_")
}

/**
 * Sort specifications by preferred order
 */
export const sortSpecifications = <T extends { originalLabel: string; label: string }>(
    specs: T[],
    isArabic: boolean
): T[] => {
    return specs.sort((a, b) => {
        const ia = PREFERRED_SPEC_ORDER.findIndex(
            (order) => normalizeKey(order) === normalizeKey(a.originalLabel) || normalizeKey(order) === normalizeKey(a.label)
        )
        const ib = PREFERRED_SPEC_ORDER.findIndex(
            (order) => normalizeKey(order) === normalizeKey(b.originalLabel) || normalizeKey(order) === normalizeKey(b.label)
        )

        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.label.localeCompare(b.label, isArabic ? "ar" : "en")
    })
}

/**
 * Process product specifications for display
 */
export const processSpecifications = (
    specifications: Record<string, any>,
    colorTemperatures: string[],
    locale: string,
    formatter: Intl.NumberFormat
) => {
    const isArabic = locale.startsWith("ar")

    const specEntries = Object.entries(specifications || {})
        .map(([label, value]) => {
            if (value === null || value === undefined || value === "") return null

            const normalizedLabel = label.toLowerCase().replace(/[_\s]/g, "")

            if (
                (normalizedLabel.includes("colortemperature") || normalizedLabel.includes("colourtemperature")) &&
                colorTemperatures.length > 0
            ) {
                return null
            }

            return {
                originalLabel: label,
                label: formatLabel(label, isArabic),
                value: formatValue(label, value, locale, formatter),
            }
        })
        .filter(Boolean) as Array<{ originalLabel: string; label: string; value: string | number }>

    if (colorTemperatures.length > 0) {
        const colorTempLabel = isArabic ? "درجة حرارة اللون" : "Color Temperature"
        specEntries.push({
            originalLabel: "color_temperature",
            label: colorTempLabel,
            value: formatColorTemps(colorTemperatures, isArabic),
        })
    }

    return sortSpecifications(specEntries, isArabic)
}