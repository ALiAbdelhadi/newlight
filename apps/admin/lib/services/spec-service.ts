import { prisma, type SpecValueType } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Editing product specifications — the other half of "product details", alongside the
 * translation editor.
 *
 * Specs are normalised (§4): a value belongs to a `SpecDefinition` that declares its type and
 * carries both labels and both units, and a sub-category declares which specs its products
 * are supposed to have. So this service works from the DEFINITIONS, not from whatever rows
 * happen to exist — otherwise a product missing a required spec would show an editor with
 * nothing in it and no way to add anything.
 *
 * The typed columns follow the definition, and follow the same rules the transform used
 * (`coerceSpecValue`), because a spec typed one way by the migration and another way by the
 * admin panel is two schemas:
 *
 *   NUMBER   valueEn/valueAr as text, plus valueNumber when it parses. A non-numeric value is
 *            kept as text rather than rejected — "12-15" is a real answer.
 *   TEXT     valueEn/valueAr only.
 *   BOOLEAN  valueBool, with the text columns carrying the same answer in words.
 *
 * `ip_rating` and `max_ip_rating` normalise to `IP<digits>` in both languages, which is what
 * the transform did to 342 values and what the storefront filter matches on.
 */

export interface SpecRow {
    key: string
    labelEn: string
    labelAr: string
    unitEn: string | null
    unitAr: string | null
    valueType: SpecValueType
    order: number
    /** Declared by the product's sub-category as expected. */
    declared: boolean
    required: boolean
    valueEn: string | null
    valueAr: string | null
    valueNumber: string | null
    valueBool: boolean | null
    /** N4: stored as a boolean where the definition says otherwise. Reported, not repaired. */
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
            // The IP standard is written in Latin on Arabic datasheets too.
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
        // Not an error. "12-15" and "220-240" are real datasheet answers; they simply have no
        // numeric form, and the numeric column is what range filters use.
        if (Number.isFinite(parsed)) out.valueNumber = String(parsed)
    }

    return out
}

export class SpecService {
    /**
     * Every spec this product could have, whether or not it has one — declared specs first in
     * their declared order, then anything the product carries that its sub-category does not
     * declare (which is itself worth seeing).
     */
    static async forProduct(productId: string): Promise<SpecRow[]> {
        await requireCurrentAdmin()

        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: {
                subCategoryId: true,
                // Ordered because the undeclared ones are rendered in this order at the end of
                // the table; an unordered read makes the row order change between renders.
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
                // Present on the product, not declared by the sub-category. Left visible and
                // editable rather than hidden, because hiding it is how it survives forever.
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

    /**
     * Save every spec in one transaction, and write ONE audit row for the change.
     *
     * A spec whose value is cleared is deleted rather than stored as an empty string — an
     * empty spec renders as a labelled blank on the product page, which reads as missing data
     * with extra steps.
     */
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
