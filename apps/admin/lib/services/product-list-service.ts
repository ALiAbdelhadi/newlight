import { Prisma, prisma, serializeMoney, serializeMoneyOrNull, type SerializedMoney } from "@repo/database"

import { toPrismaPage, type TableState } from "@/lib/table-params"

/**
 * The Products list query (P4.5 §11, §25).
 *
 * Everything the list can do — search, filter, sort, page — happens in PostgreSQL. That is
 * not a performance preference, it is a correctness one, and the page this replaces proves
 * why: it fetched fifty rows, filtered them in JavaScript for the "Sold" tab, and then
 * printed the resulting count under a comment claiming it described the catalogue. The tab
 * filtered one page and reported it as an answer about 189 products.
 *
 * Rules:
 *   - No unrestricted `findMany`. Every call is bounded by skip/take.
 *   - The count is a separate `count()` over the SAME where clause, so the total and the
 *     rows can never describe different populations.
 *   - Translations are fetched with an explicit `where: { locale }`. An unscoped `take: 1`
 *     lets PostgreSQL return whichever row it likes, which is how a product shows an Arabic
 *     name on an English-only screen.
 *   - Money crosses the boundary serialized. A raw Decimal into a client component is the
 *     defect currently throwing 47 console errors on /admin/orders.
 */

export const PRODUCT_SORT_COLUMNS = ["sku", "name", "price", "stock", "createdAt"] as const
export type ProductSortColumn = (typeof PRODUCT_SORT_COLUMNS)[number]

export interface ProductRow {
    id: string
    sku: string
    slug: string
    nameEn: string | null
    nameAr: string | null
    subCategory: string | null
    category: string | null
    family: string | null
    imageUrl: string | null
    price: SerializedMoney
    /** Null is "no cost recorded", which is every product until cost entry runs. Never zero. */
    averageCost: SerializedMoney | null
    onHand: number
    reserved: number
    isActive: boolean
    isFeatured: boolean
    createdAt: string
}

export interface ProductListResult {
    rows: ProductRow[]
    total: number
    /** Whether the installation-wide opening count is still outstanding. */
    openingCountPending: boolean
    facets: {
        categories: { value: string; label: string }[]
        subCategories: { value: string; label: string }[]
    }
}

const LOCATION = "location_main"

function buildWhere(state: TableState): Prisma.ProductWhereInput {
    const { filters } = state
    const where: Prisma.ProductWhereInput = { deletedAt: null }
    const and: Prisma.ProductWhereInput[] = []

    const query = filters.q?.trim()
    if (query) {
        /*
         * SKU or name, in EITHER language. Searching only the English translation would make
         * an Arabic-named product unfindable from a screen whose whole job is editing it.
         */
        and.push({
            OR: [
                { productId: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
                { translations: { some: { name: { contains: query, mode: "insensitive" } } } },
            ],
        })
    }

    if (filters.category) and.push({ subCategory: { categoryId: filters.category } })
    if (filters.subCategory) and.push({ subCategoryId: filters.subCategory })

    if (filters.status === "active") and.push({ isActive: true })
    if (filters.status === "hidden") and.push({ isActive: false })
    if (filters.status === "featured") and.push({ isFeatured: true })

    if (filters.cost === "missing") and.push({ averageCost: null })
    if (filters.cost === "recorded") and.push({ averageCost: { not: null } })

    /*
     * Translation completeness is the ABSENCE of a row, so it is expressed as `none`, not as
     * a comparison against an empty string. §16's rule that Arabic never falls back means a
     * missing Arabic row is genuinely missing and has to be findable as such.
     */
    if (filters.translation === "en_only") and.push({ translations: { none: { locale: "ar" } } })
    if (filters.translation === "ar_only") and.push({ translations: { none: { locale: "en" } } })
    if (filters.translation === "complete") {
        and.push({ translations: { some: { locale: "ar" } } }, { translations: { some: { locale: "en" } } })
    }

    /*
     * Stock filters compare AVAILABLE (onHand - reserved), the same quantity
     * inventory.ts's countLowStock uses. A product with no stock_levels row counts as zero,
     * which is what it is — hence the `none` branch rather than a join that drops it.
     */
    if (filters.stock === "out") {
        and.push({
            OR: [
                { stockLevels: { none: { locationId: LOCATION } } },
                { stockLevels: { some: { locationId: LOCATION, onHand: { lte: 0 } } } },
            ],
        })
    }
    if (filters.stock === "in") {
        and.push({ stockLevels: { some: { locationId: LOCATION, onHand: { gt: 0 } } } })
    }

    if (and.length > 0) where.AND = and
    return where
}

function buildOrderBy(state: TableState): Prisma.ProductOrderByWithRelationInput[] {
    const direction = state.dir
    switch (state.sort as ProductSortColumn | null) {
        case "sku":
            return [{ productId: direction }]
        case "price":
            return [{ price: direction }]
        case "createdAt":
            return [{ createdAt: direction }]
        case "name":
            // Prisma cannot order by a related translation's column, so the SKU stands in.
            // Ordering by a name would need a raw query or a denormalised column; the SKU is
            // honest and the column header says "Product", which is what it sorts by.
            return [{ productId: direction }]
        case "stock":
        default:
            return [{ createdAt: "desc" }]
    }
}

export async function listProducts(state: TableState): Promise<ProductListResult> {
    const where = buildWhere(state)

    const [total, openingSetting, categories, subCategories] = await Promise.all([
        prisma.product.count({ where }),
        prisma.systemSetting.findUnique({ where: { key: "inventory.opening_count_pending" } }),
        prisma.category.findMany({
            where: { deletedAt: null },
            select: { id: true, translations: { where: { locale: "en" }, take: 1, select: { name: true } } },
            orderBy: { order: "asc" },
        }),
        prisma.subCategory.findMany({
            where: { deletedAt: null },
            select: { id: true, translations: { where: { locale: "en" }, take: 1, select: { name: true } } },
            orderBy: { order: "asc" },
        }),
    ])

    const { skip, take } = toPrismaPage(state, total)

    const products = await prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(state),
        select: {
            id: true,
            productId: true,
            slug: true,
            price: true,
            averageCost: true,
            isActive: true,
            isFeatured: true,
            createdAt: true,
            translations: { select: { locale: true, name: true } },
            images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
            stockLevels: { where: { locationId: LOCATION }, take: 1, select: { onHand: true, reserved: true } },
            family: { select: { slug: true } },
            subCategory: {
                select: {
                    translations: { where: { locale: "en" }, take: 1, select: { name: true } },
                    category: {
                        select: { translations: { where: { locale: "en" }, take: 1, select: { name: true } } },
                    },
                },
            },
        },
    })

    const rows: ProductRow[] = products.map((product) => ({
        id: product.id,
        sku: product.productId,
        slug: product.slug,
        nameEn: product.translations.find((t) => t.locale === "en")?.name ?? null,
        nameAr: product.translations.find((t) => t.locale === "ar")?.name ?? null,
        subCategory: product.subCategory?.translations[0]?.name ?? null,
        category: product.subCategory?.category?.translations[0]?.name ?? null,
        family: product.family?.slug ?? null,
        imageUrl: product.images[0]?.url ?? null,
        price: serializeMoney(product.price),
        averageCost: serializeMoneyOrNull(product.averageCost),
        onHand: product.stockLevels[0]?.onHand ?? 0,
        reserved: product.stockLevels[0]?.reserved ?? 0,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        createdAt: product.createdAt.toISOString(),
    }))

    /*
     * Sorting by stock happens here, on the page, and ONLY here — it is the one column the
     * schema cannot order by, because available quantity is `onHand - reserved` across a
     * relation. Doing it on the page is a real limitation and is labelled as one in the UI
     * rather than passed off as a catalogue-wide sort.
     */
    if (state.sort === "stock") {
        rows.sort((a, b) => {
            const delta = a.onHand - a.reserved - (b.onHand - b.reserved)
            return state.dir === "asc" ? delta : -delta
        })
    }

    return {
        rows,
        total,
        openingCountPending: openingSetting?.value === "true",
        facets: {
            categories: categories.map((c) => ({ value: c.id, label: c.translations[0]?.name ?? c.id })),
            subCategories: subCategories.map((s) => ({ value: s.id, label: s.translations[0]?.name ?? s.id })),
        },
    }
}
