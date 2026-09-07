/**
 * The v1 -> v2 specification dictionary.
 *
 * v1 stored specifications twice, in two key spaces that share nothing:
 *
 *   en: { "IP": 20, "maximum_wattage": 2, "brand_of_led": "Bridge lux", ... }
 *   ar: { "درجة الحماية": 20, "أقصى قوة كهربائية (w)": 2, "علامة الليد التجارية": "Bridge lux", ... }
 *
 * English keys are snake_case identifiers; ARABIC KEYS ARE DISPLAY LABELS. So the transform
 * needs a two-sided dictionary, not a pass-through, and this is it. It is deliberately data
 * rather than logic: every mapping below is checkable against production by eye.
 *
 * Counts are from the production snapshot (189 products) and are asserted by
 * scripts/audit-catalog.ts, so a key appearing or disappearing is caught rather than
 * silently absorbed.
 */
import type { SpecValueType } from "@prisma/client"

/** Keys that are NOT specifications, and where each one goes instead. */
export const EXCLUDED_KEYS: Record<string, string> = {
    surface_color: "ProductAvailableColor — colours are a lookup table (§8), not descriptive text",
    "الالوان المتوفره الي المنتج": "ProductAvailableColor",
    color_Temperature: "Product.colorTemperatures — part of the cart line key and the order snapshot (§2.2)",
    "درجة حرارة لون الاضاءة": "Product.colorTemperatures",
}

export interface SpecMapping {
    /** The canonical v2 SpecDefinition.key. */
    key: string
    valueType: SpecValueType
    /** Production JSON key in each locale. Arabic may have more than one source key. */
    en: string
    ar: string[]
    /** Rows carrying this key in production, per locale. A drift here is a real change. */
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
    // سمك العود ("rod thickness", 8 track SKUs) merges here: it is the same fact as the
    // English product_dimensions on those rows. The 8 SKUs are listed in the transform
    // report so the loss of the more specific Arabic label is visible, not silent.
    { key: "product_dimensions", valueType: "TEXT", en: "product_dimensions", ar: ["ابعاد المنتج", "سمك العود"], expectedCount: 175 },
    { key: "hole_size", valueType: "TEXT", en: "hole_size", ar: ["حجم الفتحة"], expectedCount: 167 },
]

/** The 8 SKUs whose Arabic label is lost to the product_dimensions merge. */
export const ROD_THICKNESS_SKUS = [
    "nl-l1001-2000mm", "nl-l1001-3000mm", "nl-l1003-2000mm", "nl-l1003-3000mm",
    "nl-l1005-2000mm", "nl-l1005-3000mm", "nl-l1007-2000mm", "nl-l1007-3000mm",
] as const

export const BY_EN_KEY = new Map(SPEC_MAP.map((m) => [m.en, m]))
export const BY_AR_KEY = new Map(SPEC_MAP.flatMap((m) => m.ar.map((key) => [key, m] as const)))

/** A value the catalog uses to mean "not recorded". Preserved verbatim (§19/N4). */
export const PLACEHOLDER = "-"

export interface CoercedValue {
    valueEn: string | null
    valueAr: string | null
    valueNumber: string | null
    valueBool: boolean | null
    /** Set when the stored value had to be reshaped; every one is printed in the report. */
    coercion?: string
    /** Set when the stored value is a known defect. Carried across verbatim (N4). */
    defect?: string
}

/**
 * Turn one v1 JSON value into a ProductSpec row.
 *
 * Three rules that are easy to get wrong:
 *
 *   1. IP is TEXT, not a number. Production stores `IP: 20`; the row must read "IP20", not
 *      "IP Rating: 20", because the prefix is part of the value. The coercion is recorded.
 *   2. valueNumber comes from the ENGLISH side only. Arabic values use Arabic-Indic digits
 *      ("≥ ٠.٥", "٢٠٠٠ مللي") and parsing them as numbers would invent data.
 *   3. Defects are NOT repaired (N4). The two `false` booleans and the whitespace-padded
 *      materials carry across exactly as stored, flagged so P5's data-quality queue can see
 *      them. A migration that quietly improves data cannot be verified against its input.
 */
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
            // The IP standard is written in Latin on Arabic datasheets too.
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
