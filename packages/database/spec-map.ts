import type { SpecValueType } from "@prisma/client"

export const EXCLUDED_KEYS: Record<string, string> = {
    surface_color: "ProductAvailableColor — colours are a lookup table (§8), not descriptive text",
    "الالوان المتوفره الي المنتج": "ProductAvailableColor",
    color_Temperature: "Product.colorTemperatures — part of the cart line key and the order snapshot (§2.2)",
    "درجة حرارة لون الاضاءة": "Product.colorTemperatures",
}

export interface SpecMapping {
    key: string
    valueType: SpecValueType
    en: string
    ar: string[]
    expectedCount: number
}

export const SPEC_MAP: readonly SpecMapping[] = [
    { key: "lighting_type", valueType: "TEXT", en: "lighting_type", ar: ["نوع الإضاءة"], expectedCount: 10 },
    { key: "voltage", valueType: "TEXT", en: "voltage", ar: ["المدخل"], expectedCount: 167 },
    { key: "maximum_wattage", valueType: "NUMBER", en: "maximum_wattage", ar: ["أقصى قوة كهربائية (w)"], expectedCount: 167 },
    { key: "brand_of_led", valueType: "TEXT", en: "brand_of_led", ar: ["علامة الليد التجارية"], expectedCount: 91 },
    { key: "luminous_flux", valueType: "NUMBER", en: "luminous_flux", ar: ["الومن"], expectedCount: 91 },
    { key: "main_material", valueType: "TEXT", en: "main_material", ar: ["مادة التصنيع"], expectedCount: 175 },
    { key: "cri", valueType: "TEXT", en: "cri", ar: ["مؤشر تجسيد الألوان"], expectedCount: 167 },
    { key: "beam_angle", valueType: "NUMBER", en: "beam_angle", ar: ["زاوية الإضاءة°"], expectedCount: 167 },
    { key: "driver", valueType: "TEXT", en: "driver", ar: ["ترانس أو بطارية"], expectedCount: 6 },
    { key: "power_factor", valueType: "TEXT", en: "power_factor", ar: ["معامل القدرة"], expectedCount: 167 },
    { key: "ip_rating", valueType: "TEXT", en: "IP", ar: ["درجة الحماية"], expectedCount: 167 },
    { key: "max_ip_rating", valueType: "TEXT", en: "maxIP", ar: ["درجة الحماية القصوي"], expectedCount: 167 },
    { key: "life_time", valueType: "NUMBER", en: "life_time", ar: ["العمر الافتراضي"], expectedCount: 167 },
    { key: "product_dimensions", valueType: "TEXT", en: "product_dimensions", ar: ["ابعاد المنتج", "سمك العود"], expectedCount: 175 },
    { key: "hole_size", valueType: "TEXT", en: "hole_size", ar: ["حجم الفتحة"], expectedCount: 167 },
]

export const ROD_THICKNESS_SKUS = [
    "nl-l1001-2000mm", "nl-l1001-3000mm", "nl-l1003-2000mm", "nl-l1003-3000mm",
    "nl-l1005-2000mm", "nl-l1005-3000mm", "nl-l1007-2000mm", "nl-l1007-3000mm",
] as const

export const BY_EN_KEY = new Map(SPEC_MAP.map((m) => [m.en, m]))
export const BY_AR_KEY = new Map(SPEC_MAP.flatMap((m) => m.ar.map((key) => [key, m] as const)))

export const PLACEHOLDER = "-"

export interface CoercedValue {
    valueEn: string | null
    valueAr: string | null
    valueNumber: string | null
    valueBool: boolean | null
    coercion?: string
    defect?: string
}

export function coerceSpecValue(
    mapping: SpecMapping,
    rawEn: unknown,
    rawAr: unknown
): CoercedValue {
    const out: CoercedValue = { valueEn: null, valueAr: null, valueNumber: null, valueBool: null }

    if (typeof rawEn === "boolean" || typeof rawAr === "boolean") {
        out.valueBool = typeof rawEn === "boolean" ? rawEn : (rawAr as boolean)
        out.valueEn = String(rawEn ?? "")
        out.valueAr = String(rawAr ?? "")
        out.defect = `stored as boolean (${String(out.valueBool)}) where ${mapping.valueType} is expected`
        return out
    }

    out.valueEn = rawEn === null || rawEn === undefined ? null : String(rawEn)
    out.valueAr = rawAr === null || rawAr === undefined ? null : String(rawAr)

    if (mapping.key === "ip_rating" || mapping.key === "max_ip_rating") {
        const digits = out.valueEn?.match(/\d+/)?.[0]
        if (digits) {
            const formatted = `IP${digits}`
            if (out.valueEn !== formatted) out.coercion = `${out.valueEn} -> ${formatted}`
            out.valueEn = formatted
            out.valueAr = formatted
        }
        return out
    }

    if (mapping.valueType === "NUMBER" && out.valueEn && out.valueEn !== PLACEHOLDER) {
        const parsed = Number(out.valueEn)
        if (Number.isFinite(parsed)) out.valueNumber = String(parsed)
        else out.coercion = `${out.valueEn} is not numeric; stored as text only`
    }

    if (out.valueEn && out.valueEn !== out.valueEn.trim()) {
        out.defect = `valueEn has surrounding whitespace: ${JSON.stringify(out.valueEn)}`
    }

    return out
}
