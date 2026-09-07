import {
    prisma,
    requireSlug,
    LOCALES,
    type Locale,
    type Prisma,
} from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Categories and sub-categories — the half of "define a catalogue" the panel could not do.
 *
 * Everything here is per-locale, because the taxonomy has no base name or slug: a category IS
 * its two translation rows (§10). That shapes the whole service — there is no "rename the
 * category", only "rename it in Arabic", and both have to be present for the storefront to
 * render in both languages.
 *
 * Two rules that are not obvious:
 *
 *   A SLUG CHANGE WRITES HISTORY, in the same transaction. `TaxonomySlugHistory` is what turns
 *   an old URL into a 301 instead of a 404, and a rename that forgets it silently breaks every
 *   inbound link the moment it succeeds.
 *
 *   DELETION IS REFUSED WHILE ANYTHING LIVES INSIDE. A sub-category holding products, or a
 *   category holding sub-categories, is soft-deleted at best — and the refusal names the count,
 *   because "cannot delete" without a number is a dead end.
 */

export class TaxonomyError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "TaxonomyError"
    }
}

export interface TaxonomyTranslationInput {
    slug: string
    name: string
    description: string | null
    metaTitle: string | null
    metaDescription: string | null
}

export type TaxonomyInput = {
    imageUrl: string | null
    order: number
    isActive: boolean
    translations: Record<Locale, TaxonomyTranslationInput>
}

function validate(input: TaxonomyInput, label: string) {
    for (const locale of LOCALES) {
        const t = input.translations[locale]
        if (!t?.name?.trim()) {
            throw new TaxonomyError(`${label} needs a name in ${locale === "ar" ? "Arabic" : "English"}.`)
        }
        // `requireSlug` throws on anything it cannot make a slug of, rather than quietly
        // producing something else. A taxonomy URL is permanent enough to be worth an error.
        requireSlug(t.slug?.trim() || t.name, `${label} (${locale})`)
    }
}

function normalise(input: TaxonomyInput, locale: Locale) {
    const t = input.translations[locale]
    return {
        locale,
        slug: requireSlug(t.slug?.trim() || t.name, `taxonomy (${locale})`),
        name: t.name.trim(),
        description: t.description?.trim() || null,
        metaTitle: t.metaTitle?.trim() || null,
        metaDescription: t.metaDescription?.trim() || null,
    }
}

/**
 * A slug is unique per locale across BOTH the live rows and the history — the history is what
 * makes a retired slug redirect, so reusing one would make it ambiguous.
 */
async function assertSlugFree(
    tx: Prisma.TransactionClient,
    locale: Locale,
    slug: string,
    exclude: { categoryId?: string; subCategoryId?: string }
) {
    const [category, subCategory, history] = await Promise.all([
        tx.categoryTranslation.findFirst({
            where: { locale, slug, NOT: exclude.categoryId ? { categoryId: exclude.categoryId } : undefined },
            select: { id: true },
        }),
        tx.subCategoryTranslation.findFirst({
            where: { locale, slug, NOT: exclude.subCategoryId ? { subCategoryId: exclude.subCategoryId } : undefined },
            select: { id: true },
        }),
        tx.taxonomySlugHistory.findFirst({ where: { locale, slug }, select: { entityId: true } }),
    ])

    if (category || subCategory) throw new TaxonomyError(`The ${locale} URL "${slug}" is already in use.`)
    if (history && history.entityId !== (exclude.categoryId ?? exclude.subCategoryId)) {
        throw new TaxonomyError(
            `The ${locale} URL "${slug}" used to belong to something else and still redirects there. Choose another.`
        )
    }
}

export class TaxonomyService {
    /** The whole tree, with the counts that decide whether a thing can be deleted. */
    static async tree() {
        await requireCurrentAdmin()
        const categories = await prisma.category.findMany({
            orderBy: { order: "asc" },
            include: {
                translations: true,
                subCategories: {
                    orderBy: { order: "asc" },
                    include: {
                        translations: true,
                        _count: { select: { products: true, families: true } },
                    },
                },
                _count: { select: { subCategories: true } },
            },
        })
        return categories
    }

    static async category(id: string) {
        await requireCurrentAdmin()
        return prisma.category.findUniqueOrThrow({
            where: { id },
            include: { translations: true, _count: { select: { subCategories: true } } },
        })
    }

    static async subCategory(id: string) {
        await requireCurrentAdmin()
        return prisma.subCategory.findUniqueOrThrow({
            where: { id },
            include: { translations: true, _count: { select: { products: true, families: true } } },
        })
    }

    static async createCategory(input: TaxonomyInput) {
        const admin = await requireCurrentAdmin()
        validate(input, "A category")

        const category = await prisma.$transaction(async (tx) => {
            for (const locale of LOCALES) {
                await assertSlugFree(tx, locale, normalise(input, locale).slug, {})
            }
            const created = await tx.category.create({
                data: {
                    imageUrl: input.imageUrl?.trim() || null,
                    order: input.order,
                    isActive: input.isActive,
                    translations: { create: LOCALES.map((locale) => normalise(input, locale)) },
                },
                select: { id: true },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "category.create",
                    entity: "Category",
                    entityId: created.id,
                    diff: { slugs: LOCALES.map((l) => normalise(input, l).slug) },
                },
            })
            return created
        })

        await revalidateStorefront({ kind: "category" })
        return category
    }

    static async updateCategory(id: string, input: TaxonomyInput) {
        const admin = await requireCurrentAdmin()
        validate(input, "A category")

        const changes: Array<{ locale: string; from: string; to: string }> = []

        await prisma.$transaction(async (tx) => {
            const existing = await tx.categoryTranslation.findMany({ where: { categoryId: id } })

            for (const locale of LOCALES) {
                const next = normalise(input, locale)
                const current = existing.find((t) => t.locale === locale)

                if (current && current.slug !== next.slug) {
                    await assertSlugFree(tx, locale, next.slug, { categoryId: id })
                    // In the SAME transaction as the rename — this is what makes the old URL a
                    // 301 instead of a 404.
                    await tx.taxonomySlugHistory.create({
                        data: { locale, slug: current.slug, entityType: "CATEGORY", entityId: id },
                    })
                    changes.push({ locale, from: current.slug, to: next.slug })
                } else if (!current) {
                    await assertSlugFree(tx, locale, next.slug, { categoryId: id })
                }

                await tx.categoryTranslation.upsert({
                    where: { categoryId_locale: { categoryId: id, locale } },
                    create: { categoryId: id, ...next },
                    update: next,
                })
            }

            await tx.category.update({
                where: { id },
                data: {
                    imageUrl: input.imageUrl?.trim() || null,
                    order: input.order,
                    isActive: input.isActive,
                },
            })

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "category.update",
                    entity: "Category",
                    entityId: id,
                    diff: { renamed: changes, isActive: input.isActive, order: input.order },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
        return { renamed: changes }
    }

    static async createSubCategory(categoryId: string, input: TaxonomyInput) {
        const admin = await requireCurrentAdmin()
        validate(input, "A sub-category")

        const subCategory = await prisma.$transaction(async (tx) => {
            for (const locale of LOCALES) {
                await assertSlugFree(tx, locale, normalise(input, locale).slug, {})
            }
            const created = await tx.subCategory.create({
                data: {
                    categoryId,
                    imageUrl: input.imageUrl?.trim() || null,
                    order: input.order,
                    isActive: input.isActive,
                    translations: { create: LOCALES.map((locale) => normalise(input, locale)) },
                },
                select: { id: true },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "subCategory.create",
                    entity: "SubCategory",
                    entityId: created.id,
                    diff: { categoryId, slugs: LOCALES.map((l) => normalise(input, l).slug) },
                },
            })
            return created
        })

        await revalidateStorefront({ kind: "subCategory" })
        return subCategory
    }

    static async updateSubCategory(id: string, categoryId: string, input: TaxonomyInput) {
        const admin = await requireCurrentAdmin()
        validate(input, "A sub-category")

        const changes: Array<{ locale: string; from: string; to: string }> = []

        await prisma.$transaction(async (tx) => {
            const existing = await tx.subCategoryTranslation.findMany({ where: { subCategoryId: id } })

            for (const locale of LOCALES) {
                const next = normalise(input, locale)
                const current = existing.find((t) => t.locale === locale)

                if (current && current.slug !== next.slug) {
                    await assertSlugFree(tx, locale, next.slug, { subCategoryId: id })
                    await tx.taxonomySlugHistory.create({
                        data: { locale, slug: current.slug, entityType: "SUB_CATEGORY", entityId: id },
                    })
                    changes.push({ locale, from: current.slug, to: next.slug })
                } else if (!current) {
                    await assertSlugFree(tx, locale, next.slug, { subCategoryId: id })
                }

                await tx.subCategoryTranslation.upsert({
                    where: { subCategoryId_locale: { subCategoryId: id, locale } },
                    create: { subCategoryId: id, ...next },
                    update: next,
                })
            }

            await tx.subCategory.update({
                where: { id },
                data: {
                    categoryId,
                    imageUrl: input.imageUrl?.trim() || null,
                    order: input.order,
                    isActive: input.isActive,
                },
            })

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "subCategory.update",
                    entity: "SubCategory",
                    entityId: id,
                    diff: { renamed: changes, categoryId, isActive: input.isActive },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
        return { renamed: changes }
    }

    /**
     * Archive rather than delete, and refuse while anything lives inside.
     *
     * A sub-category holding products is not a mistake to clean up; it is a shelf with things
     * on it. The refusal names the count so the next step is obvious.
     */
    static async archiveSubCategory(id: string) {
        const admin = await requireCurrentAdmin()
        const products = await prisma.product.count({ where: { subCategoryId: id, deletedAt: null } })
        if (products > 0) {
            throw new TaxonomyError(
                `${products} product(s) are still in this sub-category. Move or archive them first.`
            )
        }

        await prisma.$transaction(async (tx) => {
            await tx.subCategory.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "subCategory.archive",
                    entity: "SubCategory",
                    entityId: id,
                    diff: { reversible: true },
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }

    static async archiveCategory(id: string) {
        const admin = await requireCurrentAdmin()
        const subCategories = await prisma.subCategory.count({ where: { categoryId: id, deletedAt: null } })
        if (subCategories > 0) {
            throw new TaxonomyError(
                `${subCategories} sub-categor${subCategories === 1 ? "y is" : "ies are"} still in this category. Archive them first.`
            )
        }

        await prisma.$transaction(async (tx) => {
            await tx.category.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "category.archive",
                    entity: "Category",
                    entityId: id,
                    diff: { reversible: true },
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }

    static async restore(kind: "category" | "subCategory", id: string) {
        const admin = await requireCurrentAdmin()
        await prisma.$transaction(async (tx) => {
            if (kind === "category") await tx.category.update({ where: { id }, data: { deletedAt: null } })
            else await tx.subCategory.update({ where: { id }, data: { deletedAt: null } })

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: `${kind}.restore`,
                    entity: kind === "category" ? "Category" : "SubCategory",
                    entityId: id,
                    diff: {},
                },
            })
        })
        await revalidateStorefront({ kind: "all" })
    }
}
