import { prisma, requireSlug, LOCALES, DEFAULT_LOCATION_ID } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * The reference data the catalogue is built out of: product families, colours and stock
 * locations. All three were seeded by migration and editable nowhere.
 *
 * Each one deletes differently, and the difference is the whole design:
 *
 *   FAMILY      Product.familyId   ON DELETE SET NULL   products survive, as standalone
 *   COLOUR      ProductAvailableColor  ON DELETE CASCADE   the colour vanishes from products
 *   LOCATION    StockMovement.locationId  ON DELETE RESTRICT   the database itself refuses
 *
 * So a family reports what it will scatter, a colour is refused while any product wears it, and
 * a location is refused while any stock has ever moved through it. Only the third is enforced
 * by the database; the other two would happen silently.
 */

export class ReferenceError_ extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ReferenceError"
    }
}

// --- families ---------------------------------------------------------------------------

export class FamilyService {
    static async list() {
        await requireCurrentAdmin()
        return prisma.productFamily.findMany({
            where: { deletedAt: null },
            orderBy: [{ subCategoryId: "asc" }, { order: "asc" }, { slug: "asc" }],
            include: {
                translations: true,
                _count: { select: { products: true } },
                subCategory: {
                    select: { id: true, translations: { where: { locale: "en" }, select: { name: true }, take: 1 } },
                },
            },
        })
    }

    static async create(input: {
        subCategoryId: string
        slug: string
        variantType: string | null
        nameEn: string
        nameAr: string
        order: number
    }) {
        const admin = await requireCurrentAdmin()
        const slug = requireSlug(input.slug.trim(), "family")
        if (!input.nameEn.trim() || !input.nameAr.trim()) {
            throw new ReferenceError_("A family needs a name in both English and Arabic.")
        }
        if (await prisma.productFamily.findUnique({ where: { slug }, select: { id: true } })) {
            throw new ReferenceError_(`A family with the URL "${slug}" already exists.`)
        }

        const created = await prisma.$transaction(async (tx) => {
            const family = await tx.productFamily.create({
                data: {
                    subCategoryId: input.subCategoryId,
                    slug,
                    variantType: input.variantType?.trim() || null,
                    order: input.order,
                    translations: {
                        create: LOCALES.map((locale) => ({
                            locale,
                            // Per-locale slug, unique per locale (§10). The English one is the
                            // family slug; Arabic gets its own so both URLs can exist.
                            slug: locale === "en" ? slug : `${slug}-${locale}`,
                            name: locale === "en" ? input.nameEn.trim() : input.nameAr.trim(),
                        })),
                    },
                },
                select: { id: true },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "family.create",
                    entity: "ProductFamily",
                    entityId: family.id,
                    diff: { slug, variantType: input.variantType, subCategoryId: input.subCategoryId },
                },
            })
            return family
        })

        await revalidateStorefront({ kind: "all" })
        return created
    }

    static async update(id: string, input: { variantType: string | null; nameEn: string; nameAr: string; order: number }) {
        const admin = await requireCurrentAdmin()
        if (!input.nameEn.trim() || !input.nameAr.trim()) {
            throw new ReferenceError_("A family needs a name in both English and Arabic.")
        }

        await prisma.$transaction(async (tx) => {
            await tx.productFamily.update({
                where: { id },
                data: { variantType: input.variantType?.trim() || null, order: input.order },
            })
            for (const locale of LOCALES) {
                await tx.productFamilyTranslation.updateMany({
                    where: { familyId: id, locale },
                    data: { name: locale === "en" ? input.nameEn.trim() : input.nameAr.trim() },
                })
            }
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "family.update",
                    entity: "ProductFamily",
                    entityId: id,
                    diff: { nameEn: input.nameEn.trim(), variantType: input.variantType },
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }

    /**
     * Archiving a family SCATTERS its products rather than removing them.
     *
     * `Product.familyId` is SET NULL, so every member becomes a standalone product and the
     * storefront stops showing them as one card. That is not destruction, but it is not nothing
     * either — the count is reported so it is a decision rather than a surprise.
     */
    static async archive(id: string) {
        const admin = await requireCurrentAdmin()
        const family = await prisma.productFamily.findUniqueOrThrow({
            where: { id },
            select: { slug: true, _count: { select: { products: true } } },
        })

        await prisma.$transaction(async (tx) => {
            await tx.product.updateMany({ where: { familyId: id }, data: { familyId: null } })
            await tx.productFamily.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "family.archive",
                    entity: "ProductFamily",
                    entityId: id,
                    diff: { slug: family.slug, productsScattered: family._count.products },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
        return { scattered: family._count.products }
    }

    /** Move a product into a family, out of one, or between two. */
    static async setProductFamily(productId: string, familyId: string | null, variantValue: string | null) {
        const admin = await requireCurrentAdmin()
        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: { productId: true, familyId: true, subCategoryId: true },
        })

        if (familyId) {
            const family = await prisma.productFamily.findUniqueOrThrow({
                where: { id: familyId },
                select: { subCategoryId: true, slug: true },
            })
            // A family belongs to one sub-category; a product in a different one would appear
            // under a heading it does not live beneath.
            if (family.subCategoryId !== product.subCategoryId) {
                throw new ReferenceError_(
                    `"${family.slug}" belongs to a different sub-category. Move the product first, or pick a family from its own.`
                )
            }
        }

        await prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: { id: productId },
                data: { familyId, variantValue: variantValue?.trim() || null },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.family",
                    entity: "Product",
                    entityId: productId,
                    diff: { sku: product.productId, from: product.familyId, to: familyId, variantValue },
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }
}

// --- colours ----------------------------------------------------------------------------

export class ColorService {
    static async list() {
        await requireCurrentAdmin()
        return prisma.productColor.findMany({
            orderBy: [{ order: "asc" }, { key: "asc" }],
            include: { _count: { select: { products: true, images: true } } },
        })
    }

    static async create(input: { key: string; hex: string; nameEn: string; nameAr: string; order: number }) {
        const admin = await requireCurrentAdmin()
        const key = input.key.trim().toUpperCase()
        const hex = input.hex.trim().toUpperCase()

        if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
            throw new ReferenceError_(
                `"${input.key}" is not a valid key. Use uppercase letters, digits and underscores — it is a stable identifier, not a label.`
            )
        }
        if (!/^#[0-9A-F]{6}$/.test(hex)) throw new ReferenceError_(`"${input.hex}" is not a hex colour like #1A2B3C.`)
        if (!input.nameEn.trim() || !input.nameAr.trim()) {
            throw new ReferenceError_("A colour needs a name in both English and Arabic.")
        }
        if (await prisma.productColor.findUnique({ where: { key }, select: { id: true } })) {
            throw new ReferenceError_(`A colour called "${key}" already exists.`)
        }

        const created = await prisma.$transaction(async (tx) => {
            const color = await tx.productColor.create({
                data: { key, hex, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), order: input.order },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "color.create",
                    entity: "ProductColor",
                    entityId: color.id,
                    diff: { key, hex, nameEn: color.nameEn },
                },
            })
            return color
        })

        await revalidateStorefront({ kind: "all" })
        return created
    }

    static async update(id: string, input: { hex: string; nameEn: string; nameAr: string; order: number; isActive: boolean }) {
        const admin = await requireCurrentAdmin()
        const hex = input.hex.trim().toUpperCase()
        if (!/^#[0-9A-F]{6}$/.test(hex)) throw new ReferenceError_(`"${input.hex}" is not a hex colour like #1A2B3C.`)
        if (!input.nameEn.trim() || !input.nameAr.trim()) {
            throw new ReferenceError_("A colour needs a name in both English and Arabic.")
        }

        // The KEY is not editable: it is stored on cart and order rows as a snapshot
        // (`selectedColorKey`), deliberately without a foreign key, so renaming it would
        // orphan the colour recorded on every past order.
        await prisma.$transaction(async (tx) => {
            await tx.productColor.update({
                where: { id },
                data: {
                    hex,
                    nameEn: input.nameEn.trim(),
                    nameAr: input.nameAr.trim(),
                    order: input.order,
                    isActive: input.isActive,
                },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "color.update",
                    entity: "ProductColor",
                    entityId: id,
                    diff: { hex, nameEn: input.nameEn.trim(), isActive: input.isActive },
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }

    /**
     * Refused while any product offers it.
     *
     * `ProductAvailableColor.colorId` CASCADES: the database would remove the colour from every
     * product that offers it without a word, and `ProductImage.colorId` would go to NULL,
     * un-linking photographs from the colour they show. Deactivating is the reversible answer
     * and the UI offers it instead.
     */
    static async remove(id: string) {
        const admin = await requireCurrentAdmin()
        const color = await prisma.productColor.findUniqueOrThrow({
            where: { id },
            select: { key: true, nameEn: true, _count: { select: { products: true, images: true } } },
        })

        if (color._count.products > 0 || color._count.images > 0) {
            throw new ReferenceError_(
                `${color.nameEn} is offered by ${color._count.products} product(s) and shown in ${color._count.images} photo(s). ` +
                    `Deleting it would remove it from all of them. Deactivate it instead — it stops being offered and nothing is lost.`
            )
        }

        await prisma.$transaction(async (tx) => {
            await tx.productColor.delete({ where: { id } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "color.delete",
                    entity: "ProductColor",
                    entityId: id,
                    diff: { key: color.key, irreversible: true },
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }

    /** Which colours a product is offered in. */
    static async setForProduct(productId: string, colorIds: string[]) {
        const admin = await requireCurrentAdmin()

        await prisma.$transaction(async (tx) => {
            const before = await tx.productAvailableColor.findMany({
                where: { productId },
                select: { colorId: true },
            })
            await tx.productAvailableColor.deleteMany({ where: { productId } })
            if (colorIds.length > 0) {
                await tx.productAvailableColor.createMany({
                    data: colorIds.map((colorId, order) => ({ productId, colorId, order })),
                })
            }
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.colors",
                    entity: "Product",
                    entityId: productId,
                    diff: { before: before.map((b) => b.colorId).sort(), after: [...colorIds].sort() },
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }
}

// --- locations --------------------------------------------------------------------------

export class LocationService {
    static async list() {
        await requireCurrentAdmin()
        const locations = await prisma.location.findMany({
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            include: { _count: { select: { movements: true, stockLevels: true } } },
        })
        // What is actually sitting in each one — the number that decides whether it can go.
        const totals = await prisma.stockLevel.groupBy({ by: ["locationId"], _sum: { onHand: true } })
        const byLocation = new Map(totals.map((t) => [t.locationId, t._sum.onHand ?? 0]))
        return locations.map((location) => ({ ...location, onHand: byLocation.get(location.id) ?? 0 }))
    }

    static async create(name: string) {
        const admin = await requireCurrentAdmin()
        if (!name.trim()) throw new ReferenceError_("A location needs a name.")

        const created = await prisma.$transaction(async (tx) => {
            const location = await tx.location.create({ data: { name: name.trim(), isDefault: false } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "location.create",
                    entity: "Location",
                    entityId: location.id,
                    diff: { name: location.name },
                },
            })
            return location
        })
        return created
    }

    static async rename(id: string, name: string) {
        const admin = await requireCurrentAdmin()
        if (!name.trim()) throw new ReferenceError_("A location needs a name.")
        const before = await prisma.location.findUniqueOrThrow({ where: { id }, select: { name: true } })

        await prisma.$transaction(async (tx) => {
            await tx.location.update({ where: { id }, data: { name: name.trim() } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "location.rename",
                    entity: "Location",
                    entityId: id,
                    diff: { from: before.name, to: name.trim() },
                },
            })
        })
    }

    /**
     * Exactly one default, always.
     *
     * `DEFAULT_LOCATION_ID` is what every adjustment, receipt and sale uses when no location is
     * given — which is all of them today. Two defaults would make that ambiguous and none would
     * make it fail, so the switch is a single transaction that clears the old one.
     */
    static async setDefault(id: string) {
        const admin = await requireCurrentAdmin()
        await prisma.$transaction(async (tx) => {
            await tx.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            await tx.location.update({ where: { id }, data: { isDefault: true } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "location.set_default",
                    entity: "Location",
                    entityId: id,
                    diff: { note: `${DEFAULT_LOCATION_ID} is the code default; this changes the database default` },
                },
            })
        })
    }

    /**
     * Refused while any stock has ever moved through it.
     *
     * `StockMovement.locationId` is ON DELETE RESTRICT, so the database refuses this on its
     * own — which is exactly right, because those movements ARE the history of stock that
     * physically moved. This checks first only so the message is a sentence instead of a
     * foreign-key error.
     */
    static async remove(id: string) {
        const admin = await requireCurrentAdmin()
        const location = await prisma.location.findUniqueOrThrow({
            where: { id },
            select: { name: true, isDefault: true, _count: { select: { movements: true } } },
        })

        if (location.isDefault) {
            throw new ReferenceError_("This is the default location. Make another one the default first.")
        }
        if (location._count.movements > 0) {
            throw new ReferenceError_(
                `${location._count.movements} stock movement(s) happened at ${location.name}. Deleting it would destroy the record of stock that physically moved.`
            )
        }

        await prisma.$transaction(async (tx) => {
            await tx.stockLevel.deleteMany({ where: { locationId: id } })
            await tx.location.delete({ where: { id } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "location.delete",
                    entity: "Location",
                    entityId: id,
                    diff: { name: location.name },
                },
            })
        })
    }
}
