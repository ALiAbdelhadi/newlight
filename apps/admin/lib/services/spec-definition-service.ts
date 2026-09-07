import { prisma, type SpecValueType } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Managing the specification DICTIONARY — which measurements exist at all.
 *
 * `SpecDefinition` was seeded by migration `0006` and read-only ever since, so a new kind of
 * fixture with a measurement nobody had thought of could not be described without writing a
 * migration. `SubCategorySpec` — which specs a sub-category expects — was the same.
 *
 * The dangerous part is not creating one. It is deleting one:
 *
 *     ProductSpec.spec  →  SpecDefinition  ON DELETE CASCADE
 *
 * Removing a definition takes every product's value for it with it, silently, with no
 * confirmation from the database. So deletion is refused while any value exists, and the
 * refusal names the count. Nothing here can be undone by an undo button; it is prevented
 * instead.
 */

export class SpecDefinitionError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "SpecDefinitionError"
    }
}

export interface SpecDefinitionInput {
    key: string
    valueType: SpecValueType
    labelEn: string
    labelAr: string
    unitEn: string | null
    unitAr: string | null
    order: number
}

/** Keys are referenced from SQL, the transform's dictionary and the storefront's filters. */
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

export class SpecDefinitionService {
    /** Every definition, with what would be lost if it were deleted. */
    static async list() {
        await requireCurrentAdmin()
        return prisma.specDefinition.findMany({
            orderBy: [{ order: "asc" }, { key: "asc" }],
            include: { _count: { select: { productSpecs: true, subCategories: true } } },
        })
    }

    static async get(key: string) {
        await requireCurrentAdmin()
        return prisma.specDefinition.findUniqueOrThrow({
            where: { key },
            include: { _count: { select: { productSpecs: true, subCategories: true } } },
        })
    }

    static async create(input: SpecDefinitionInput) {
        const admin = await requireCurrentAdmin()
        const key = input.key.trim().toLowerCase()

        if (!KEY_PATTERN.test(key)) {
            throw new SpecDefinitionError(
                `"${key}" is not a valid key. Use lowercase letters, digits and underscores, starting with a letter — it is referenced from SQL and from the storefront's filters.`
            )
        }
        if (!input.labelEn.trim() || !input.labelAr.trim()) {
            throw new SpecDefinitionError("A specification needs a label in both English and Arabic.")
        }
        if (await prisma.specDefinition.findUnique({ where: { key }, select: { key: true } })) {
            throw new SpecDefinitionError(`A specification called "${key}" already exists.`)
        }

        const created = await prisma.$transaction(async (tx) => {
            const definition = await tx.specDefinition.create({
                data: {
                    key,
                    valueType: input.valueType,
                    labelEn: input.labelEn.trim(),
                    labelAr: input.labelAr.trim(),
                    unitEn: input.unitEn?.trim() || null,
                    unitAr: input.unitAr?.trim() || null,
                    order: input.order,
                },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "spec.create",
                    entity: "SpecDefinition",
                    entityId: key,
                    diff: { key, valueType: input.valueType, labelEn: definition.labelEn },
                },
            })
            return definition
        })

        await revalidateStorefront({ kind: "all" })
        return created
    }

    /**
     * Labels, units and order can change freely — they are presentation.
     *
     * The KEY cannot: it is the primary key, it is what `ProductSpec` rows point at, and it is
     * written into the storefront's filters and the transform's dictionary. Renaming it would
     * be a migration, not an edit, so it is not offered.
     *
     * The TYPE can change, but only when it does not contradict data that already exists —
     * `valueNumber` is derived from the text when a spec is NUMBER, and switching an existing
     * TEXT spec to NUMBER would leave every current row without one. The count is checked and
     * reported rather than silently coerced.
     */
    static async update(key: string, input: Omit<SpecDefinitionInput, "key">) {
        const admin = await requireCurrentAdmin()

        const existing = await prisma.specDefinition.findUniqueOrThrow({
            where: { key },
            include: { _count: { select: { productSpecs: true } } },
        })

        if (!input.labelEn.trim() || !input.labelAr.trim()) {
            throw new SpecDefinitionError("A specification needs a label in both English and Arabic.")
        }

        if (input.valueType !== existing.valueType && existing._count.productSpecs > 0) {
            const nonNumeric =
                input.valueType === "NUMBER"
                    ? await prisma.productSpec.count({
                          where: { specKey: key, valueNumber: null, NOT: { valueEn: null } },
                      })
                    : 0

            if (nonNumeric > 0) {
                throw new SpecDefinitionError(
                    `${nonNumeric} of ${existing._count.productSpecs} existing values are not numeric ` +
                        `("12-15" and "220-240" are real answers). Change those first, or leave this as ${existing.valueType}.`
                )
            }
        }

        await prisma.$transaction(async (tx) => {
            await tx.specDefinition.update({
                where: { key },
                data: {
                    valueType: input.valueType,
                    labelEn: input.labelEn.trim(),
                    labelAr: input.labelAr.trim(),
                    unitEn: input.unitEn?.trim() || null,
                    unitAr: input.unitAr?.trim() || null,
                    order: input.order,
                },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "spec.update",
                    entity: "SpecDefinition",
                    entityId: key,
                    diff: {
                        labelEn: [existing.labelEn, input.labelEn.trim()],
                        valueType: [existing.valueType, input.valueType],
                        order: [existing.order, input.order],
                    },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
    }

    /**
     * Delete a definition — only when nothing uses it.
     *
     * `ProductSpec.specKey` cascades, so the database would take every product's value for this
     * measurement without a word. That is the entire reason this method counts first.
     */
    static async remove(key: string) {
        const admin = await requireCurrentAdmin()
        const definition = await prisma.specDefinition.findUniqueOrThrow({
            where: { key },
            include: { _count: { select: { productSpecs: true, subCategories: true } } },
        })

        if (definition._count.productSpecs > 0) {
            throw new SpecDefinitionError(
                `${definition._count.productSpecs} product(s) have a value for "${definition.labelEn}". ` +
                    `Deleting it would delete every one of those values. Clear them first if you really mean to.`
            )
        }
        if (definition._count.subCategories > 0) {
            throw new SpecDefinitionError(
                `${definition._count.subCategories} sub-categor${definition._count.subCategories === 1 ? "y" : "ies"} still ask for "${definition.labelEn}". Remove it from them first.`
            )
        }

        await prisma.$transaction(async (tx) => {
            await tx.specDefinition.delete({ where: { key } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "spec.delete",
                    entity: "SpecDefinition",
                    entityId: key,
                    diff: { key, labelEn: definition.labelEn, irreversible: true },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
    }

    // --- which specs a sub-category asks for ------------------------------------------------

    static async forSubCategory(subCategoryId: string) {
        await requireCurrentAdmin()
        const [assigned, all] = await Promise.all([
            prisma.subCategorySpec.findMany({
                where: { subCategoryId },
                include: { spec: true },
                orderBy: [{ order: "asc" }, { specKey: "asc" }],
            }),
            prisma.specDefinition.findMany({ orderBy: [{ order: "asc" }, { key: "asc" }] }),
        ])
        return { assigned, all }
    }

    /**
     * Replace a sub-category's whole list in one transaction.
     *
     * Removing an assignment does NOT delete any product's value — `ProductSpec` is a different
     * table with no dependency on this one. Those values keep existing and the product page
     * marks them "not declared here", which is deliberate: unasking a question is not the same
     * as destroying the answers that were already given.
     */
    static async setForSubCategory(
        subCategoryId: string,
        specs: Array<{ specKey: string; required: boolean; order: number }>
    ) {
        const admin = await requireCurrentAdmin()

        await prisma.$transaction(async (tx) => {
            const before = await tx.subCategorySpec.findMany({
                where: { subCategoryId },
                select: { specKey: true, required: true },
            })

            await tx.subCategorySpec.deleteMany({ where: { subCategoryId } })
            if (specs.length > 0) {
                await tx.subCategorySpec.createMany({
                    data: specs.map((s) => ({
                        subCategoryId,
                        specKey: s.specKey,
                        required: s.required,
                        order: s.order,
                    })),
                })
            }

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "subCategory.specs_set",
                    entity: "SubCategory",
                    entityId: subCategoryId,
                    diff: {
                        before: before.map((b) => b.specKey).sort(),
                        after: specs.map((s) => s.specKey).sort(),
                    },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
    }
}
