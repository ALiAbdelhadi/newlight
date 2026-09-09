import { prisma, type SpecValueType } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

export interface SpecRow {
    key: string
    labelEn: string
    labelAr: string
    unitEn: string | null
    unitAr: string | null
    valueType: SpecValueType
    order: number
    declared: boolean
    required: boolean
    valueEn: string | null
    valueAr: string | null
    valueNumber: string | null
    valueBool: boolean | null
    typeMismatch: boolean
}

export interface SpecInput {
    key: string
    valueEn: string | null
    valueAr: string | null
}

const PLACEHOLDER = "-"
const IP_KEYS = new Set(["ip_rating", "max_ip_rating"])

function coerce(valueType: SpecValueType, key: string, valueEn: string | null, valueAr: string | null) {
    const out = {
        valueEn: valueEn?.trim() ? valueEn.trim() : null,
        valueAr: valueAr?.trim() ? valueAr.trim() : null,
        valueNumber: null as string | null,
        valueBool: null as boolean | null,
    }

    if (IP_KEYS.has(key)) {
        const digits = out.valueEn?.match(/\d+/)?.[0] ?? out.valueAr?.match(/\d+/)?.[0]
        if (digits) {
            const formatted = `IP${digits}`
            out.valueEn = formatted
            out.valueAr = formatted
        }
        return out
    }

    if (valueType === "BOOLEAN") {
        const truthy = new Set(["true", "yes", "1", "نعم", "متوفر"])
        const falsy = new Set(["false", "no", "0", "لا", "غير متوفر"])
        const probe = (out.valueEn ?? out.valueAr ?? "").toLowerCase()
        if (truthy.has(probe)) out.valueBool = true
        else if (falsy.has(probe)) out.valueBool = false
        return out
    }

    if (valueType === "NUMBER" && out.valueEn && out.valueEn !== PLACEHOLDER) {
        const parsed = Number(out.valueEn)
        if (Number.isFinite(parsed)) out.valueNumber = String(parsed)
    }

    return out
}

export class SpecService {
    static async forProduct(productId: string): Promise<SpecRow[]> {
        await requireCurrentAdmin()

        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: {
                subCategoryId: true,
                specs: { include: { spec: true }, orderBy: { specKey: "asc" } },
            },
        })

        const declared = await prisma.subCategorySpec.findMany({
            where: { subCategoryId: product.subCategoryId },
            include: { spec: true },
            orderBy: [{ order: "asc" }, { specKey: "asc" }],
        })

        const values = new Map(product.specs.map((s) => [s.specKey, s]))
        const rows: SpecRow[] = []
        const seen = new Set<string>()

        for (const entry of declared) {
            const value = values.get(entry.specKey)
            seen.add(entry.specKey)
            rows.push({
                key: entry.specKey,
                labelEn: entry.spec.labelEn,
                labelAr: entry.spec.labelAr,
                unitEn: entry.spec.unitEn,
                unitAr: entry.spec.unitAr,
                valueType: entry.spec.valueType,
                order: entry.spec.order,
                declared: true,
                required: entry.required,
                valueEn: value?.valueEn ?? null,
                valueAr: value?.valueAr ?? null,
                valueNumber: value?.valueNumber?.toString() ?? null,
                valueBool: value?.valueBool ?? null,
                typeMismatch: value?.valueBool != null && entry.spec.valueType !== "BOOLEAN",
            })
        }

        for (const value of product.specs) {
            if (seen.has(value.specKey)) continue
            rows.push({
                key: value.specKey,
                labelEn: value.spec.labelEn,
                labelAr: value.spec.labelAr,
                unitEn: value.spec.unitEn,
                unitAr: value.spec.unitAr,
                valueType: value.spec.valueType,
                order: value.spec.order,
                declared: false,
                required: false,
                valueEn: value.valueEn,
                valueAr: value.valueAr,
                valueNumber: value.valueNumber?.toString() ?? null,
                valueBool: value.valueBool,
                typeMismatch: value.valueBool != null && value.spec.valueType !== "BOOLEAN",
            })
        }

        return rows
    }

    static async save(productId: string, inputs: SpecInput[]) {
        const admin = await requireCurrentAdmin()

        const definitions = new Map(
            (await prisma.specDefinition.findMany({ select: { key: true, valueType: true } })).map((d) => [
                d.key,
                d.valueType,
            ])
        )

        const before = await prisma.productSpec.findMany({
            where: { productId },
            select: { specKey: true, valueEn: true, valueAr: true },
        })
        const beforeByKey = new Map(before.map((b) => [b.specKey, b]))

        const changes: Array<{ key: string; from: string | null; to: string | null }> = []

        await prisma.$transaction(async (tx) => {
            for (const input of inputs) {
                const valueType = definitions.get(input.key)
                if (!valueType) throw new Error(`unknown specification "${input.key}"`)

                const next = coerce(valueType, input.key, input.valueEn, input.valueAr)
                const previous = beforeByKey.get(input.key)
                const isEmpty = next.valueEn === null && next.valueAr === null

                if (isEmpty) {
                    if (previous) {
                        await tx.productSpec.delete({
                            where: { productId_specKey: { productId, specKey: input.key } },
                        })
                        changes.push({ key: input.key, from: previous.valueEn, to: null })
                    }
                    continue
                }

                if (previous && previous.valueEn === next.valueEn && previous.valueAr === next.valueAr) continue

                await tx.productSpec.upsert({
                    where: { productId_specKey: { productId, specKey: input.key } },
                    create: { productId, specKey: input.key, ...next },
                    update: next,
                })
                changes.push({ key: input.key, from: previous?.valueEn ?? null, to: next.valueEn })
            }

            if (changes.length > 0) {
                await tx.adminAuditLog.create({
                    data: {
                        actorType: "ADMIN",
                        actorId: admin.id,
                        actorEmail: admin.email,
                        action: "product.specs_save",
                        entity: "Product",
                        entityId: productId,
                        diff: { changes },
                    },
                })
            }
        })

        if (changes.length > 0) await revalidateStorefront({ kind: "all" })
        return { changed: changes.length }
    }
}
