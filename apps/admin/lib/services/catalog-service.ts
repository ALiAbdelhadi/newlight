import {
    prisma,
    requireSlug,
    money,
    serializeMoney,
    recordMovement,
    DEFAULT_LOCATION_ID,
    type Locale,
} from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Catalog lifecycle — BUILD §13.2 items 4, 5 and 6.
 *
 * Three rules, each of which is a guarantee rather than a habit:
 *
 *   SOFT DELETE IS THE DEFAULT. `deletedAt` is set; the row stays. A product with orders
 *   behind it is a product an invoice still refers to, and deleting it would make that
 *   invoice unreadable. Hard delete exists but refuses while ANY reference remains.
 *
 *   MONEY SNAPSHOTS ARE IMMUTABLE (item 4). `OrderItem.price` and
 *   `ProductConfiguration.configPrice` are copies taken at the time of sale, and nothing here
 *   touches them. Repricing a product NEVER rewrites what a customer was charged — see
 *   `assertSnapshotsIntact`, which is the assertion, not the intention.
 *
 *   EVERY MUTATION REVALIDATES THE STOREFRONT (item 5), because it is a separate deployment
 *   and cannot see this one.
 */

export interface DeletionBlockers {
    orderItems: number
    cartItems: number
    configurations: number
}

export class CatalogError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "CatalogError"
    }
}

export class CatalogService {
    /** What is standing between this product and a hard delete. */
    static async deletionBlockers(productId: string): Promise<DeletionBlockers> {
        await requireCurrentAdmin()
        const [orderItems, cartItems, configurations] = await Promise.all([
            prisma.orderItem.count({ where: { productId } }),
            prisma.cartItem.count({ where: { productId } }),
            prisma.productConfiguration.count({ where: { productId } }),
        ])
        return { orderItems, cartItems, configurations }
    }

    /**
     * The normal way to remove a product. Reversible, and it keeps every order that mentions
     * it readable.
     */
    static async softDelete(productId: string) {
        const admin = await requireCurrentAdmin()

        const product = await prisma.$transaction(async (tx) => {
            const updated = await tx.product.update({
                where: { id: productId },
                data: { deletedAt: new Date(), isActive: false },
                select: { id: true, productId: true, slug: true },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.soft_delete",
                    entity: "Product",
                    entityId: productId,
                    diff: { sku: updated.productId, reversible: true },
                },
            })
            return updated
        })

        await revalidateStorefront({ kind: "all" })
        return product
    }

    static async restore(productId: string) {
        const admin = await requireCurrentAdmin()
        const product = await prisma.$transaction(async (tx) => {
            const updated = await tx.product.update({
                where: { id: productId },
                data: { deletedAt: null },
                select: { id: true, productId: true },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.restore",
                    entity: "Product",
                    entityId: productId,
                    diff: { sku: updated.productId },
                },
            })
            return updated
        })
        await revalidateStorefront({ kind: "all" })
        return product
    }

    /**
     * Hard delete, and only when nothing refers to the product (§13.2 item 6).
     *
     * The refusal is not politeness. `OrderItem.productId` is `ON DELETE RESTRICT` and
     * `StockMovement.productId` likewise, so the database would refuse anyway — this refuses
     * FIRST, with a list of what is in the way, instead of surfacing a foreign-key error.
     */
    static async hardDelete(productId: string) {
        const admin = await requireCurrentAdmin()
        const blockers = await this.deletionBlockers(productId)
        const total = blockers.orderItems + blockers.cartItems + blockers.configurations

        if (total > 0) {
            throw new CatalogError(
                `this product cannot be hard-deleted: ${blockers.orderItems} order item(s), ` +
                    `${blockers.cartItems} cart item(s) and ${blockers.configurations} configuration(s) refer to it. ` +
                    `Soft-delete it instead — every order that mentions it stays readable.`
            )
        }

        const movements = await prisma.stockMovement.count({ where: { productId } })
        if (movements > 0) {
            throw new CatalogError(
                `this product has ${movements} stock movement(s). Deleting it would destroy the record of ` +
                    `stock that physically moved. Soft-delete it instead.`
            )
        }

        const product = await prisma.$transaction(async (tx) => {
            const target = await tx.product.findUniqueOrThrow({
                where: { id: productId },
                select: { productId: true, slug: true },
            })
            await tx.product.delete({ where: { id: productId } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.hard_delete",
                    entity: "Product",
                    entityId: productId,
                    // Irreversible, so the audit row carries what it was.
                    diff: { sku: target.productId, slug: target.slug, irreversible: true },
                },
            })
            return target
        })

        await revalidateStorefront({ kind: "all" })
        return product
    }

    /**
     * Rename a product's slug, keeping the old URL alive (§10).
     *
     * The history row is written in the SAME transaction as the rename, which is what stops a
     * rename from breaking every inbound link the moment it succeeds.
     */
    static async rename(productId: string, nextSlug: string) {
        const admin = await requireCurrentAdmin()
        const slug = requireSlug(nextSlug, `product ${productId}`)

        const result = await prisma.$transaction(async (tx) => {
            const current = await tx.product.findUniqueOrThrow({
                where: { id: productId },
                select: { slug: true, productId: true },
            })
            if (current.slug === slug) return { slug, changed: false }

            await tx.productSlugHistory.create({ data: { productId, slug: current.slug } })
            await tx.product.update({ where: { id: productId }, data: { slug } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.rename",
                    entity: "Product",
                    entityId: productId,
                    diff: { sku: current.productId, from: current.slug, to: slug, redirect: "301" },
                },
            })
            return { slug, changed: true }
        })

        if (result.changed) await revalidateStorefront({ kind: "all" })
        return result
    }

    /**
     * §13.2 item 4, as an assertion.
     *
     * Every OrderItem holds the price the customer was charged. This proves no order's line
     * total has drifted from what its order recorded — which is the observable consequence of
     * a repricing ever having rewritten a snapshot.
     */
    static async assertSnapshotsIntact(): Promise<Array<{ orderNumber: string; recorded: string; fromItems: string }>> {
        await requireCurrentAdmin()
        return prisma.$queryRaw<Array<{ orderNumber: string; recorded: string; fromItems: string }>>`
            SELECT o."orderNumber",
                   (o.subtotal)::text     AS recorded,
                   (SUM(i.price * i.quantity))::text AS "fromItems"
              FROM orders o
              JOIN order_items i ON i."orderId" = o.id
             GROUP BY o.id, o."orderNumber", o.subtotal
            HAVING o.subtotal <> SUM(i.price * i.quantity)`
    }

    /**
     * §13.2 item 8 / N5: the data-quality queue.
     *
     * Reported, never repaired. A migration that quietly improves data is a migration whose
     * output cannot be verified against its input, and the same holds for an admin panel.
     */
    static async dataQualityQueue(locale: Locale = "en") {
        await requireCurrentAdmin()

        // Every one of these is ORDERED, and not for tidiness.
        //
        // PostgreSQL returns unordered rows in whatever order it likes, and it need not be the
        // same order twice. The page prints the first three of each list, so two renders of
        // the same request could disagree — which is what "Hydration failed because the server
        // rendered HTML didn't match the client" was, on this page, for real data.
        //
        // A query whose result is rendered needs a total order. `productId` is unique, so this
        // is one.
        const [missingTranslations, placeholderSpecs, booleanSpecs, noImages, noColors] = await Promise.all([
            prisma.product.findMany({
                where: { deletedAt: null, translations: { none: { locale } } },
                select: { id: true, productId: true },
                orderBy: { productId: "asc" },
            }),
            prisma.productSpec.count({ where: { valueEn: "-" } }),
            prisma.productSpec.findMany({
                where: { valueBool: { not: null } },
                select: { specKey: true, product: { select: { productId: true } } },
                orderBy: [{ productId: "asc" }, { specKey: "asc" }],
            }),
            prisma.product.findMany({
                where: { deletedAt: null, images: { none: {} } },
                select: { id: true, productId: true },
                orderBy: { productId: "asc" },
            }),
            prisma.product.findMany({
                where: { deletedAt: null, availableColors: { none: {} } },
                select: { id: true, productId: true },
                orderBy: { productId: "asc" },
            }),
        ])

        // The taxonomy's own Arabic names. Four carry a trailing space, and seven contain Latin
        // script — some legitimately (COB, LED, and the 2×120 Cm size are written in Latin on
        // Arabic datasheets, like IP ratings), others not (Linear, Cylinder, Downlight, Wall
        // Washer are ordinary English words sitting in an Arabic name). Which is which is a
        // naming decision, so both are reported and neither is repaired.
        const arabicTaxonomy = await prisma.subCategoryTranslation.findMany({
            where: { locale: "ar" },
            select: { subCategoryId: true, name: true, slug: true },
            orderBy: { slug: "asc" },
        })
        const taxonomyDefects = arabicTaxonomy
            .filter((row) => /[A-Za-z]/.test(row.name) || row.name !== row.name.trim())
            .map((row) => ({
                subCategoryId: row.subCategoryId,
                slug: row.slug,
                name: row.name,
                untrimmed: row.name !== row.name.trim(),
                containsLatin: /[A-Za-z]/.test(row.name),
            }))

        return {
            missingTranslations,
            taxonomyDefects,
            placeholderSpecs,
            // N4: the `false` booleans on nl-strip-2835-19w / -24w.
            booleanSpecs,
            noImages,
            // N2-adjacent: 16 production products carry no colour at all.
            noColors,
        }
    }
}

export interface NewProductInput {
    /** The business SKU. Editable later, unique now. */
    sku: string
    slug: string
    subCategoryId: string
    familyId: string | null
    variantValue: string | null
    price: string
    colorTemperatures: string[]
    nameEn: string
    nameAr: string
    descriptionEn: string | null
    descriptionAr: string | null
    /** Opening stock. Goes through the ledger like every other movement, or is omitted. */
    openingStock: number | null
}

/**
 * Creating a product — the thing the admin panel could not do.
 *
 * P5 built the whole editing surface for 189 products and no way to add the 190th, which meant
 * a new fixture still arrived through a migration or by hand in psql. Everything else in this
 * file exists to change a product; this is where one starts.
 *
 * Four decisions worth stating:
 *
 *   BOTH LOCALES ARE REQUIRED. A product created in English only is a product that renders as
 *   a gap on the Arabic storefront, and the translation queue would report it the next day.
 *   Refusing at creation is cheaper than reporting it forever.
 *
 *   OPENING STOCK GOES THROUGH THE LEDGER. `recordMovement`, an `INITIAL` movement, the same
 *   path the migration used — never a direct write to `stock_levels`. A product whose first
 *   stock has no movement behind it is a hole in the audit trail on day one.
 *
 *   IT IS CREATED INACTIVE. It has no photograph yet, and a product with no photograph on a
 *   lighting storefront is worse than a product that is not there. Activating it is a separate,
 *   deliberate click on a page that shows what is still missing.
 *
 *   THE SLUG IS CHECKED, NOT COERCED. `requireSlug` rejects what it cannot make a slug of
 *   rather than silently producing something else — the URL is permanent enough to be worth an
 *   error message.
 */
export class CatalogCreationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "CatalogCreationError"
    }
}

export async function createProduct(input: NewProductInput) {
    const admin = await requireCurrentAdmin()

    const sku = input.sku.trim()
    if (!sku) throw new CatalogCreationError("A product needs a SKU.")
    if (!input.nameEn.trim() || !input.nameAr.trim()) {
        throw new CatalogCreationError("A product needs a name in both English and Arabic.")
    }

    const slug = requireSlug(input.slug.trim() || sku, `product ${sku}`)

    let price: string
    try {
        price = serializeMoney(money(input.price))
    } catch {
        throw new CatalogCreationError(`"${input.price}" is not a price.`)
    }
    if (Number(price) <= 0) throw new CatalogCreationError("A price must be greater than zero.")

    // Checked before the transaction so the message names the conflict rather than surfacing a
    // unique-constraint violation.
    const [bySku, bySlug] = await Promise.all([
        prisma.product.findUnique({ where: { productId: sku }, select: { id: true, deletedAt: true } }),
        prisma.product.findUnique({ where: { slug }, select: { id: true } }),
    ])
    if (bySku) {
        throw new CatalogCreationError(
            bySku.deletedAt
                ? `SKU ${sku} belongs to an archived product. Restore that one instead of creating a duplicate.`
                : `SKU ${sku} already exists.`
        )
    }
    if (bySlug) throw new CatalogCreationError(`The URL /${slug} is already taken.`)

    const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
            data: {
                productId: sku,
                slug,
                subCategoryId: input.subCategoryId,
                familyId: input.familyId,
                variantValue: input.variantValue?.trim() || null,
                price,
                colorTemperatures: input.colorTemperatures as never,
                // Inactive until it has a photograph — see above.
                isActive: false,
                translations: {
                    create: [
                        {
                            locale: "en",
                            name: input.nameEn.trim(),
                            description: input.descriptionEn?.trim() || null,
                        },
                        {
                            locale: "ar",
                            name: input.nameAr.trim(),
                            description: input.descriptionAr?.trim() || null,
                        },
                    ],
                },
            },
            select: { id: true, productId: true, slug: true },
        })

        if (input.openingStock && input.openingStock > 0) {
            await recordMovement(tx, {
                productId: created.id,
                locationId: DEFAULT_LOCATION_ID,
                type: "INITIAL",
                quantity: input.openingStock,
                unitCost: null,
                reason: "opening stock at creation",
                referenceType: "manual",
                referenceId: `${admin.id}:${Date.now()}`,
                actorType: "ADMIN",
                actorId: admin.id,
            })
        }

        await tx.adminAuditLog.create({
            data: {
                actorType: "ADMIN",
                actorId: admin.id,
                actorEmail: admin.email,
                action: "product.create",
                entity: "Product",
                entityId: created.id,
                diff: { sku, slug, price, openingStock: input.openingStock ?? 0 },
            },
        })

        return created
    })

    await revalidateStorefront({ kind: "all" })
    return product
}
