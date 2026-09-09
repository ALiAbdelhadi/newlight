import {
    prisma,
    Prisma,
    DEFAULT_LOCATION_ID,
    resolveEffectivePrice,
    serializeMoney,
    type Locale,
    type SerializedMoney,
} from "@repo/database"
import { liveProduct, productCardInclude, productDetailInclude, productLinkedCardInclude, toCardView } from "./selectors"
import { getLocaleOrDefault } from "../db"
import { activeDiscounts } from "@/lib/discounts"
import { Product } from "@/types"
import type { SpecificationSource } from "./shared-types"

/**
 * The exact row shape returned by getProduct / getProducts / searchProducts.
 *
 * Derived from the Prisma query instead of hand-written, so it cannot drift from
 * what the database actually returns. The previous hand-written interface
 * under-declared `subCategory` (optional) and omitted `specifications` from the
 * translation rows, which is why every call site needed an `as any`.
 */
export type ProductWithTranslations = Prisma.ProductGetPayload<{
    include: {
        translations: true
        subCategory: {
            include: {
                translations: true
                category: { include: { translations: true } }
            }
        }
    }
}>

export class ProductService {
    private static extractSpecifications(product: SpecificationSource, locale: string): Record<string, string | number | string[]> | null {
        const translation = product.translations?.find((t) => t.locale === locale)
        const specs = translation?.specifications

        if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
            return null
        }

        const record = specs as Record<string, unknown>
        const result: Record<string, string | number | string[]> = {}
        let hasValidEntries = false

        for (const [key, value] of Object.entries(record)) {
            if (typeof value === 'string' || typeof value === 'number' || Array.isArray(value)) {
                result[key] = value as string | number | string[]
                hasValidEntries = true
            }
        }

        return hasValidEntries ? result : null
    }

    private static async sortAlphabetically<T extends {
        order?: number
        isFeatured?: boolean
        translations?: Array<{ locale: string; name: string }>
    }>(
        items: T[],
        locale: string
    ): Promise<T[]> {
        return [...items].sort((a, b) => {
            if (a.isFeatured !== undefined && b.isFeatured !== undefined) {
                if (a.isFeatured && !b.isFeatured) return -1
                if (!a.isFeatured && b.isFeatured) return 1
            }

            if (a.order !== undefined && b.order !== undefined) {
                if (a.order !== b.order) {
                    return a.order - b.order
                }
            }

            const nameA = a.translations?.find((t) => t.locale === locale)?.name || ""
            const nameB = b.translations?.find((t) => t.locale === locale)?.name || ""

            return nameA.localeCompare(nameB, locale === "ar" ? "ar" : "en", {
                numeric: true,
                sensitivity: "base",
            })
        })
    }

    /**
     * Get product by ID with translations
     */
    static async getProduct(
        productId: string,
        locale: string = "en"
    ): Promise<ProductWithTranslations | null> {
        const product = await prisma.product.findUnique({
            where: { productId },
            include: {
                translations: {
                    where: { locale },
                    take: 1,
                },
                subCategory: {
                    include: {
                        translations: {
                            where: { locale },
                            take: 1,
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        })

        return product
    }

    /**
     * Get multiple products by IDs
     */
    static async getProducts(
        productIds: string[],
        locale: string = "en"
    ): Promise<ProductWithTranslations[]> {
        const products = await prisma.product.findMany({
            where: {
                productId: { in: productIds },
            },
            include: {
                translations: {
                    where: { locale },
                    take: 1,
                },
                subCategory: {
                    include: {
                        translations: {
                            where: { locale },
                            take: 1,
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        })

        return products
    }

    static async getAllProducts(locale?: string, limit?: number): Promise<Product[]> {
        const resolvedLocale = await getLocaleOrDefault(locale)
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
            },
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
            take: limit,
            include: {
                translations: true,
                subCategory: {
                    include: {
                        translations: {
                            where: { locale: resolvedLocale },
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale: resolvedLocale },
                                },
                            },
                        },
                    },
                },
            },
        })

        const mappedProducts = products.map(product => ({
            ...product,
            specifications: this.extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter((t) => t.locale === resolvedLocale)
        }))

        const sorted = await this.sortAlphabetically(mappedProducts, resolvedLocale)
        return sorted as unknown as Product[]
    }

    /**
     * Featured products for the homepage, in the order the SKUs were given.
     *
     * `specifications` is gone from the payload: it was a JSONB blob on the translation row
     * that 0011 dropped, and it was never rendered on a card anyway. The include now carries
     * images and both taxonomy levels, because these cards build their own links and slugs
     * are per-locale (§9.2).
     */
    static async getProductsByIds(skus: string[], locale: Locale) {
        const products = await prisma.product.findMany({
            where: { productId: { in: skus }, ...liveProduct },
            include: productLinkedCardInclude(locale),
        })

        const bySku = new Map(products.map((product) => [product.productId, product]))
        return skus.flatMap((sku) => {
            const product = bySku.get(sku)
            return product ? [product] : []
        })
    }

    /**
     * Check product availability
     */
    /**
     * Stock a customer could actually buy right now — the ONE availability read (§13.4).
     *
     * v1 had three independent inventory-mutation paths; this file held the second, a
     * check-then-mutate pair (`reserveInventory` / `releaseInventory`) that decremented
     * `Product.inventory` with no transaction and no isolation level. Both are DELETED
     * (§8.2, §13.2) rather than ported: mutating stock now goes through
     * packages/database/inventory.ts, which is the only writer of the ledger, and neither of
     * them had a single caller anywhere in the app.
     */
    static async checkAvailability(
        productId: string,
        quantity: number
    ): Promise<{ available: boolean; onHand: number; reserved: number; available_qty: number }> {
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { id: true },
        })
        if (!product) throw new Error("PRODUCT_NOT_FOUND")

        const level = await prisma.stockLevel.findUnique({
            where: { productId_locationId: { productId: product.id, locationId: DEFAULT_LOCATION_ID } },
            select: { onHand: true, reserved: true },
        })

        const onHand = level?.onHand ?? 0
        const reserved = level?.reserved ?? 0
        const free = Math.max(0, onHand - reserved)
        return { available: free >= quantity, onHand, reserved, available_qty: free }
    }

    /**
     * The price, as a STRING (ADR 0001). Returning `number` was how a Decimal column got
     * silently converted back into binary floating point at the first call site.
     */
    static async getProductPrice(productId: string): Promise<SerializedMoney> {
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { id: true, price: true, familyId: true, subCategoryId: true },
        })
        if (!product) throw new Error("PRODUCT_NOT_FOUND")
        // The EFFECTIVE price, not the column. A helper called "getProductPrice" that returns
        // the pre-discount number is a trap for whoever calls it next (§13.2).
        return resolveEffectivePrice(product.price, product, await activeDiscounts()).effective
    }

    /**
     * Search products
     */
    static async searchProducts(params: {
        query?: string
        categoryId?: string
        subCategoryId?: string
        locale?: string
        skip?: number
        take?: number
    }): Promise<ProductWithTranslations[]> {
        const { query, categoryId, subCategoryId, locale = "en", skip = 0, take = 20 } = params

        const where: Prisma.ProductWhereInput = {}

        if (query) {
            where.OR = [
                {
                    translations: {
                        some: {
                            name: { contains: query, mode: "insensitive" },
                            locale,
                        },
                    },
                },
                {
                    productId: { contains: query, mode: "insensitive" },
                },
            ]
        }

        if (subCategoryId) {
            where.subCategoryId = subCategoryId
        } else if (categoryId) {
            where.subCategory = {
                categoryId,
            }
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                translations: {
                    where: { locale },
                    take: 1,
                },
                subCategory: {
                    include: {
                        translations: {
                            where: { locale },
                            take: 1,
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
            skip,
            take,
            orderBy: { createdAt: "desc" },
        })

        return products
    }

    /**
     * The other SKUs in this product's family — BUILD §6.
     *
     * v1 grouped by `baseProductId`, a SKU-shaped string with no foreign key behind it, and
     * the storefront re-derived the grouping at runtime with a regex. v2 reads `familyId`,
     * a real relation the transform populated from that same verified data (§1.5 confirmed
     * zero inconsistent families across all 89), so there is no derivation and no regex.
     */
    static async getProductVariants(slug: string, locale: Locale) {
        const product = await prisma.product.findFirst({
            where: { slug, ...liveProduct },
            select: { familyId: true },
        })
        if (!product?.familyId) return []

        const variants = await prisma.product.findMany({
            where: { familyId: product.familyId, ...liveProduct },
            orderBy: { displayOrder: "asc" },
            include: { ...productCardInclude(locale), family: true },
        })

        // Through `toCardView`, so the variant strip cannot be the one place that still ships
        // `averageCost` to the browser — spreading the row is exactly how it got there.
        const discounts = await activeDiscounts()
        return variants.map((variant) => ({
            ...toCardView(variant, discounts),
            name: variant.translations[0]?.name ?? variant.productId,
        }))
    }

    /**
     * A product page, by slug (§9.3: one slug shared across locales).
     *
     * Returns null for a slug that does not resolve; the caller checks
     * `taxonomy.resolveProductSlug` first when it needs to tell "gone" from "moved" and issue
     * a 301 rather than a 404.
     */
    static async getProductBySlug(slug: string, locale: Locale) {
        const product = await prisma.product.findFirst({
            where: { slug, ...liveProduct },
            include: productDetailInclude(locale),
        })
        if (!product) return null

        const [variants, stock, discounts] = await Promise.all([
            this.getProductVariants(slug, locale),
            prisma.stockLevel.findUnique({
                where: { productId_locationId: { productId: product.id, locationId: DEFAULT_LOCATION_ID } },
                select: { onHand: true, reserved: true },
            }),
            activeDiscounts(),
        ])

        return {
            // Drops `averageCost`, serialises `price`, and applies whatever discount is live —
            // see toCardView. A page that has to remember is a page that will forget.
            ...toCardView(product, discounts),
            // `valueNumber` is a Decimal too, and the product page hands specs straight to a
            // client component — which React rejects outright (A82). Half a boundary is none.
            specs: product.specs.map((spec) => ({
                ...spec,
                valueNumber: spec.valueNumber === null ? null : serializeMoney(spec.valueNumber),
            })),
            variants,
            inStock: Math.max(0, (stock?.onHand ?? 0) - (stock?.reserved ?? 0)) > 0,
        }
    }

    /** By editable SKU rather than slug — the admin links and the configure flow use this. */
    static async getProductBySku(sku: string, locale: Locale) {
        const product = await prisma.product.findFirst({
            where: { productId: sku, ...liveProduct },
            select: { slug: true },
        })
        return product ? this.getProductBySlug(product.slug, locale) : null
    }
}

export type ProductDetailView = NonNullable<Awaited<ReturnType<typeof ProductService.getProductBySlug>>>
export type ProductVariantView = Awaited<ReturnType<typeof ProductService.getProductVariants>>[number]
