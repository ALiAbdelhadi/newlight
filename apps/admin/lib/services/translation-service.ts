import { prisma, LOCALES, type Locale } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Translation editing — BUILD §13.2 item 7.
 *
 * The contract has four parts, and the third is the one that shapes this file:
 *
 *   PAIRED. Both locales are loaded and returned together, always, so the editor can put them
 *   side by side. Editing one language while the other is off-screen is how the two drift.
 *
 *   COMPLETE OR NOT — per entity, visibly. `completeness()` counts filled fields, and counts a
 *   PLACEHOLDER as unfilled (see below).
 *
 *   NO SILENT FALLBACK. Nothing in here substitutes English when Arabic is missing. A missing
 *   Arabic name comes back as `null` and the UI must show it as missing. A fallback is a
 *   translation that looks finished and never gets finished.
 *
 *   ARABIC IS RTL. That is the editor's job (`dir="rtl"` on the ar column), but this service
 *   marks which locale it applies to so the UI doesn't hard-code a language check.
 */

/**
 * A26. Every one of the 378 production `ProductTranslation.name` values is the SKU — the
 * catalog has no human-readable names in EITHER language. A row whose name is its own SKU is
 * a placeholder, not a translation, and counting it as filled would report a catalog that is
 * 100% translated and 0% usable.
 */
function isPlaceholderName(name: string | null | undefined, sku: string): boolean {
    if (!name) return true
    const n = name.trim()
    return n.length === 0 || n === "-" || n.toLowerCase() === sku.toLowerCase()
}

export const RTL_LOCALES: readonly Locale[] = ["ar"]
export function isRtl(locale: Locale): boolean {
    return RTL_LOCALES.includes(locale)
}

export interface TranslationFields {
    name: string | null
    description: string | null
    metaTitle: string | null
    metaDescription: string | null
}

export interface TranslationPair {
    entity: "product" | "category" | "subCategory"
    entityId: string
    reference: string
    /** Keyed by locale; a locale with no row at all is present with every field null. */
    locales: Record<Locale, TranslationFields & { exists: boolean; dir: "ltr" | "rtl" }>
    completeness: Record<Locale, { filled: number; total: number; missing: string[] }>
}

const TRANSLATABLE_FIELDS = ["name", "description", "metaTitle", "metaDescription"] as const
type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number]

function emptyFields(): TranslationFields {
    return { name: null, description: null, metaTitle: null, metaDescription: null }
}

function score(fields: TranslationFields, sku: string | null) {
    const missing: string[] = []
    for (const field of TRANSLATABLE_FIELDS) {
        const value = fields[field]
        const blank =
            field === "name" && sku !== null
                ? isPlaceholderName(value, sku)
                : value === null || value.trim().length === 0
        if (blank) missing.push(field)
    }
    return { filled: TRANSLATABLE_FIELDS.length - missing.length, total: TRANSLATABLE_FIELDS.length, missing }
}

function pair(
    entity: TranslationPair["entity"],
    entityId: string,
    reference: string,
    rows: Array<{ locale: string } & TranslationFields>,
    sku: string | null
): TranslationPair {
    const locales = {} as TranslationPair["locales"]
    const completeness = {} as TranslationPair["completeness"]

    for (const locale of LOCALES) {
        const row = rows.find((r) => r.locale === locale)
        const fields: TranslationFields = row
            ? {
                  name: row.name,
                  description: row.description,
                  metaTitle: row.metaTitle,
                  metaDescription: row.metaDescription,
              }
            : emptyFields()
        locales[locale] = { ...fields, exists: Boolean(row), dir: isRtl(locale) ? "rtl" : "ltr" }
        completeness[locale] = score(fields, sku)
    }

    return { entity, entityId, reference, locales, completeness }
}

export class TranslationService {
    static async forProduct(productId: string): Promise<TranslationPair> {
        await requireCurrentAdmin()
        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: { id: true, productId: true, translations: true },
        })
        return pair("product", product.id, product.productId, product.translations, product.productId)
    }

    /**
     * Taxonomy has NO base slug — the slug is per-locale and lives on the translation row
     * (§10). So the human reference for a category is its English slug, and a category with no
     * English row has nothing but its id to be called by; that is itself the finding.
     */
    static async forSubCategory(subCategoryId: string): Promise<TranslationPair> {
        await requireCurrentAdmin()
        const row = await prisma.subCategory.findUniqueOrThrow({
            where: { id: subCategoryId },
            select: { id: true, translations: true },
        })
        const reference = row.translations.find((t) => t.locale === "en")?.slug ?? row.id
        return pair("subCategory", row.id, reference, row.translations, null)
    }

    static async forCategory(categoryId: string): Promise<TranslationPair> {
        await requireCurrentAdmin()
        const row = await prisma.category.findUniqueOrThrow({
            where: { id: categoryId },
            select: { id: true, translations: true },
        })
        const reference = row.translations.find((t) => t.locale === "en")?.slug ?? row.id
        return pair("category", row.id, reference, row.translations, null)
    }

    /**
     * Save BOTH locales in one transaction.
     *
     * Deliberately not "save the Arabic tab" — a half-save is exactly the drift the paired
     * editor exists to prevent, and a failure part-way through would leave one language ahead
     * of the other with no record of which.
     */
    static async saveProduct(productId: string, input: Record<Locale, TranslationFields>) {
        const admin = await requireCurrentAdmin()

        await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUniqueOrThrow({
                where: { id: productId },
                select: { productId: true, translations: true },
            })

            for (const locale of LOCALES) {
                const next = input[locale]
                await tx.productTranslation.upsert({
                    where: { productId_locale: { productId, locale } },
                    create: { productId, locale, ...next, name: next.name ?? product.productId },
                    update: { ...next, name: next.name ?? product.productId },
                })
            }

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "translation.save",
                    entity: "Product",
                    entityId: productId,
                    diff: {
                        sku: product.productId,
                        before: product.translations.map((t) => ({
                            locale: t.locale,
                            name: t.name,
                            description: t.description,
                        })),
                        after: LOCALES.map((locale) => ({
                            locale,
                            name: input[locale].name,
                            description: input[locale].description,
                        })),
                    },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
    }

    /**
     * The missing-translations queue (§13.2 item 7).
     *
     * Ordered worst-first so the queue is a work list rather than a catalog dump: an entity
     * with no Arabic row at all outranks one that merely lacks a meta description.
     */
    static async queue(limit = 100) {
        await requireCurrentAdmin()

        const products = await prisma.product.findMany({
            where: { deletedAt: null },
            select: { id: true, productId: true, translations: true },
            // The sort below has a full tiebreak, but the SLICE at the end does not — an
            // unordered query makes "the first 100" a different hundred each time.
            orderBy: { productId: "asc" },
        })

        const rows = products
            .map((p) => pair("product", p.id, p.productId, p.translations, p.productId))
            .map((entry) => {
                const missing = LOCALES.reduce((sum, l) => sum + entry.completeness[l].missing.length, 0)
                const absentLocales = LOCALES.filter((l) => !entry.locales[l].exists)
                return { ...entry, missingCount: missing, absentLocales }
            })
            .filter((entry) => entry.missingCount > 0)
            .sort(
                (a, b) =>
                    b.absentLocales.length - a.absentLocales.length ||
                    b.missingCount - a.missingCount ||
                    a.reference.localeCompare(b.reference)
            )

        return { total: rows.length, rows: rows.slice(0, limit) }
    }

    /** Headline numbers for the dashboard: how much of the catalog is actually translated. */
    static async coverage() {
        await requireCurrentAdmin()
        const products = await prisma.product.findMany({
            where: { deletedAt: null },
            select: { id: true, productId: true, translations: true },
            orderBy: { productId: "asc" },
        })

        const perLocale = {} as Record<Locale, { complete: number; partial: number; absent: number }>
        for (const locale of LOCALES) perLocale[locale] = { complete: 0, partial: 0, absent: 0 }

        for (const p of products) {
            const entry = pair("product", p.id, p.productId, p.translations, p.productId)
            for (const locale of LOCALES) {
                const c = entry.completeness[locale]
                if (!entry.locales[locale].exists) perLocale[locale].absent += 1
                else if (c.missing.length === 0) perLocale[locale].complete += 1
                else perLocale[locale].partial += 1
            }
        }

        return { products: products.length, perLocale }
    }
}

export type { TranslatableField }
