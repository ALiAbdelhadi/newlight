import { prisma, type SpecValueType } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

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

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

export class SpecDefinitionService {
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
