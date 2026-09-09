import {
    compareMoney,
    loadActiveDiscounts,
    MIN_EFFECTIVE_PRICE,
    money,
    prisma,
    resolveEffectivePrice,
    serializeMoney,
    subtractMoney,
    sumMoney,
    type ActiveDiscount,
    type DiscountKind,
    type DiscountScopeType,
    type SerializedMoney,
} from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Discounts — §13.2, the design amendment A21 deferred.
 *
 * The screen this serves answers one question the bulk repricer cannot: "take 15% off this
 * family, from Thursday to the end of the month." Repricing writes the new number into
 * `products.price` and forgets the old one; a discount is an overlay with a window, resolved
 * at read time by `@repo/database/pricing`, which is why nothing has to run at midnight for a
 * sale to end.
 *
 * This service does three things the resolver deliberately does not:
 *
 *   1. It PREVIEWS. Every price the discount would change, before the discount exists, with
 *      the same old→new table the repricer shows — because "−20% on Indoor" is a claim about
 *      189 products that an operator cannot check in their head.
 *
 *   2. It VALIDATES against the catalogue, not just against the column constraints. A window
 *      that has already ended, a scope containing no products, a fixed amount larger than the
 *      cheapest product in scope: all rejected here, with the SKUs named.
 *
 *   3. It AUDITS. Creating, stopping and rescheduling each write an AdminAuditLog row with the
 *      actor and the full scope, so "why did this order go out at 850" has an answer after the
 *      discount has expired.
 *
 * Discounts are stopped, never deleted, once they have started: an order placed under one has
 * to stay explicable. A discount that never started has explained nothing yet, and deleting a
 * mistyped one before it runs is the correct affordance — so that, and only that, is allowed.
 */

export type DiscountStatus = "scheduled" | "live" | "ended" | "stopped"

export interface DiscountScopeInput {
    type: DiscountScopeType
    categoryId?: string
    subCategoryId?: string
    familyId?: string
    productIds?: readonly string[]
}

export interface DiscountInput {
    name: string
    kind: DiscountKind
    /** Percent, or an amount off. A string all the way down (ADR 0001). */
    value: string
    scope: DiscountScopeInput
    startsAt: Date
    endsAt: Date
}

export interface DiscountPreviewRow {
    productId: string
    sku: string
    name: string
    basePrice: SerializedMoney
    newPrice: SerializedMoney
    saving: SerializedMoney
    /** A discount already live on this product that beats or ties the proposed one. */
    supersededBy: string | null
}

export interface DiscountPreview {
    rows: DiscountPreviewRow[]
    count: number
    baseTotal: SerializedMoney
    newTotal: SerializedMoney
    totalSaving: SerializedMoney
    /** Rows the amount would push to the floor. Refused: see `clamped` in the resolver. */
    clamped: DiscountPreviewRow[]
    /** Rows where a discount that is already live gives the customer as much or more. */
    overlapping: DiscountPreviewRow[]
}

export interface DiscountRow {
    id: string
    name: string
    kind: DiscountKind
    value: SerializedMoney
    scopeType: DiscountScopeType
    scopeLabel: string
    startsAt: Date
    endsAt: Date
    status: DiscountStatus
    productCount: number
    createdByEmail: string | null
    createdAt: Date
}

export class DiscountError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "DiscountError"
    }
}

/** The longest a discount may run. A "sale" with no end is a price change (§13.2). */
export const MAX_DISCOUNT_DAYS = 400

function statusOf(row: { isActive: boolean; startsAt: Date; endsAt: Date }, now: Date): DiscountStatus {
    if (!row.isActive) return "stopped"
    if (row.endsAt <= now) return "ended"
    if (row.startsAt > now) return "scheduled"
    return "live"
}

/**
 * The scope, as the Prisma where-clause for the products it covers.
 *
 * The same shape as `PricingService.whereFor` on purpose: an operator who previews "-10% on
 * Indoor" and then reprices Indoor must see the same set of products both times.
 */
function whereForScope(scope: DiscountScopeInput) {
    const live = { deletedAt: null, isActive: true } as const
    switch (scope.type) {
        case "ALL":
            return live
        case "CATEGORY":
            return { ...live, subCategory: { categoryId: scope.categoryId } }
        case "SUB_CATEGORY":
            return { ...live, subCategoryId: scope.subCategoryId }
        case "FAMILY":
            return { ...live, familyId: scope.familyId }
        case "PRODUCTS":
            return { ...live, id: { in: [...(scope.productIds ?? [])] } }
        default:
            throw new DiscountError("unknown scope")
    }
}

/** Validates the input against itself. Catalogue checks happen in `preview`. */
function assertValid(input: DiscountInput, now: Date) {
    const name = input.name.trim()
    if (name.length === 0) throw new DiscountError("give the discount a name — it is how you find it later.")
    if (name.length > 80) throw new DiscountError("that name is too long; 80 characters is the limit.")

    let value
    try {
        value = money(input.value)
    } catch {
        throw new DiscountError(`"${input.value}" is not an amount.`)
    }
    if (compareMoney(value, "0") <= 0) throw new DiscountError("a discount has to take something off.")
    if (input.kind === "PERCENT" && compareMoney(value, "100") >= 0) {
        throw new DiscountError("100% off is free. If that is the intent, set the price instead.")
    }

    if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) {
        throw new DiscountError("the start date is not a date.")
    }
    if (!(input.endsAt instanceof Date) || Number.isNaN(input.endsAt.getTime())) {
        throw new DiscountError("the end date is not a date.")
    }
    if (input.endsAt <= input.startsAt) throw new DiscountError("the discount has to end after it starts.")
    if (input.endsAt <= now) throw new DiscountError("that window has already passed.")

    const days = (input.endsAt.getTime() - input.startsAt.getTime()) / 86_400_000
    if (days > MAX_DISCOUNT_DAYS) {
        throw new DiscountError(
            `${Math.round(days)} days is not a sale, it is a price. Use bulk repricing for a permanent change.`
        )
    }

    switch (input.scope.type) {
        case "CATEGORY":
            if (!input.scope.categoryId) throw new DiscountError("choose a category.")
            break
        case "SUB_CATEGORY":
            if (!input.scope.subCategoryId) throw new DiscountError("choose a sub-category.")
            break
        case "FAMILY":
            if (!input.scope.familyId) throw new DiscountError("choose a family.")
            break
        case "PRODUCTS":
            if (!input.scope.productIds?.length) throw new DiscountError("name at least one product.")
            break
    }
}

/** The proposed discount, in the shape the resolver matches with. Never persisted. */
function asCandidate(input: DiscountInput, productIds: readonly string[]): ActiveDiscount {
    return {
        id: "candidate",
        name: input.name,
        kind: input.kind,
        value: serializeMoney(input.value),
        scopeType: "PRODUCTS",
        subCategoryIds: [],
        familyId: null,
        // Resolved to the exact set the scope matched, so the preview and the storefront run
        // the same code on the same products rather than two implementations of one rule.
        productIds,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
    }
}

export class DiscountService {
    /** Every discount, newest first, with the status an operator sorts by. */
    static async list(): Promise<DiscountRow[]> {
        await requireCurrentAdmin()
        const now = new Date()

        const rows = await prisma.discount.findMany({
            orderBy: [{ startsAt: "desc" }],
            include: {
                category: { select: { translations: { where: { locale: "en" }, take: 1, select: { name: true } } } },
                subCategory: { select: { translations: { where: { locale: "en" }, take: 1, select: { name: true } } } },
                family: { select: { slug: true } },
                _count: { select: { products: true } },
            },
        })

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            kind: row.kind,
            value: serializeMoney(row.value),
            scopeType: row.scopeType,
            scopeLabel:
                row.scopeType === "ALL"
                    ? "Whole catalogue"
                    : row.scopeType === "CATEGORY"
                      ? (row.category?.translations[0]?.name ?? "Category")
                      : row.scopeType === "SUB_CATEGORY"
                        ? (row.subCategory?.translations[0]?.name ?? "Sub-category")
                        : row.scopeType === "FAMILY"
                          ? (row.family?.slug ?? "Family")
                          : `${row._count.products} product${row._count.products === 1 ? "" : "s"}`,
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            status: statusOf(row, now),
            productCount: row._count.products,
            createdByEmail: row.createdByEmail,
            createdAt: row.createdAt,
        }))
    }

    /**
     * What this discount would do, before it exists.
     *
     * `overlapping` is the part that is easy to leave out and expensive to leave out: discounts
     * do not stack, so a new 10% on a family already covered by a live 20% changes nothing for
     * a customer, and an operator who is not told that will assume the screen is broken.
     */
    static async preview(input: DiscountInput): Promise<DiscountPreview> {
        await requireCurrentAdmin()
        const now = new Date()
        assertValid(input, now)

        const products = await prisma.product.findMany({
            where: whereForScope(input.scope),
            select: {
                id: true,
                productId: true,
                price: true,
                familyId: true,
                subCategoryId: true,
                translations: { where: { locale: "en" }, take: 1, select: { name: true } },
            },
            orderBy: { productId: "asc" },
        })

        if (products.length === 0) throw new DiscountError("that selection contains no live products.")

        const candidate = asCandidate(
            input,
            products.map((product) => product.id)
        )
        // What is ALREADY live over the same window, so the preview can say when the proposed
        // discount would change nothing. Loaded at the discount's start, not at now: a sale
        // that begins on Thursday competes with what is live on Thursday.
        const existing = await loadActiveDiscounts(prisma, input.startsAt)

        const rows: DiscountPreviewRow[] = products.map((product) => {
            const proposed = resolveEffectivePrice(product.price, product, [candidate])
            const current = resolveEffectivePrice(product.price, product, existing)

            return {
                productId: product.id,
                sku: product.productId,
                name: product.translations[0]?.name ?? product.productId,
                basePrice: proposed.base,
                newPrice: proposed.effective,
                saving: proposed.saving,
                supersededBy:
                    current.discount && compareMoney(current.effective, proposed.effective) <= 0
                        ? current.discount.name
                        : null,
            }
        })

        // The resolver CLAMPS rather than inverting a price (MIN_EFFECTIVE_PRICE), so a fixed
        // amount bigger than the product is not an error there — it is here, before the row
        // exists, where the operator can still see WHICH products it would flatten. Only an
        // AMOUNT can do it: a percentage below 100 cannot reach zero, and 100 is refused.
        const clamped =
            input.kind === "AMOUNT"
                ? rows.filter(
                      (row) =>
                          compareMoney(subtractMoney(row.basePrice, input.value), MIN_EFFECTIVE_PRICE) < 0
                  )
                : []

        return {
            rows,
            count: rows.length,
            baseTotal: serializeMoney(sumMoney(rows.map((row) => row.basePrice))),
            newTotal: serializeMoney(sumMoney(rows.map((row) => row.newPrice))),
            totalSaving: serializeMoney(sumMoney(rows.map((row) => row.saving))),
            clamped,
            overlapping: rows.filter((row) => row.supersededBy !== null),
        }
    }

    static async create(input: DiscountInput) {
        const admin = await requireCurrentAdmin()
        const preview = await this.preview(input)

        if (preview.clamped.length > 0) {
            throw new DiscountError(
                `${preview.clamped.length} product(s) cost less than that discount takes off: ${preview.clamped
                    .slice(0, 5)
                    .map((row) => row.sku)
                    .join(", ")}. Use a percentage, or narrow the scope.`
            )
        }

        const scope = input.scope
        const discount = await prisma.$transaction(async (tx) => {
            const created = await tx.discount.create({
                data: {
                    name: input.name.trim(),
                    kind: input.kind,
                    value: serializeMoney(input.value),
                    scopeType: scope.type,
                    categoryId: scope.type === "CATEGORY" ? scope.categoryId : null,
                    subCategoryId: scope.type === "SUB_CATEGORY" ? scope.subCategoryId : null,
                    familyId: scope.type === "FAMILY" ? scope.familyId : null,
                    startsAt: input.startsAt,
                    endsAt: input.endsAt,
                    createdById: admin.id,
                    createdByEmail: admin.email,
                    ...(scope.type === "PRODUCTS"
                        ? {
                              products: {
                                  createMany: {
                                      data: (scope.productIds ?? []).map((productId) => ({ productId })),
                                  },
                              },
                          }
                        : {}),
                },
            })

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "discount.create",
                    entity: "Discount",
                    entityId: created.id,
                    diff: {
                        name: created.name,
                        kind: created.kind,
                        value: serializeMoney(created.value),
                        scope: { ...scope, productIds: scope.productIds ? [...scope.productIds] : undefined },
                        startsAt: created.startsAt.toISOString(),
                        endsAt: created.endsAt.toISOString(),
                        // The set as it stood when the discount was made. A product added to
                        // the family tomorrow is covered too — this records what was known.
                        affected: preview.count,
                        baseTotal: preview.baseTotal,
                        newTotal: preview.newTotal,
                    },
                },
            })

            return created
        })

        await revalidateStorefront({ kind: "all" })
        return { id: discount.id, count: preview.count, totalSaving: preview.totalSaving }
    }

    /**
     * End a discount now.
     *
     * `isActive = false` rather than a row change or a delete: the window stays on the record,
     * so an order placed inside it is still explained by a discount that says it was live then.
     */
    static async stop(id: string) {
        const admin = await requireCurrentAdmin()
        const existing = await prisma.discount.findUnique({ where: { id } })
        if (!existing) throw new DiscountError("that discount no longer exists.")
        if (!existing.isActive) throw new DiscountError("that discount is already stopped.")

        await prisma.$transaction(async (tx) => {
            await tx.discount.update({ where: { id }, data: { isActive: false } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "discount.stop",
                    entity: "Discount",
                    entityId: id,
                    diff: {
                        name: existing.name,
                        stoppedAt: new Date().toISOString(),
                        wouldHaveEndedAt: existing.endsAt.toISOString(),
                    },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
        return { name: existing.name }
    }

    /**
     * Move the window.
     *
     * A live discount can only have its END moved — moving the start of a sale that has already
     * run rewrites history the orders placed under it disagree with. A scheduled one can have
     * both, because it has not happened yet.
     */
    static async reschedule(id: string, startsAt: Date, endsAt: Date) {
        const admin = await requireCurrentAdmin()
        const now = new Date()
        const existing = await prisma.discount.findUnique({ where: { id } })
        if (!existing) throw new DiscountError("that discount no longer exists.")
        if (!existing.isActive) throw new DiscountError("a stopped discount cannot be rescheduled.")
        if (existing.endsAt <= now) throw new DiscountError("that discount has already ended.")
        if (endsAt <= startsAt) throw new DiscountError("the discount has to end after it starts.")
        if (endsAt <= now) throw new DiscountError("the new end is in the past.")

        const started = existing.startsAt <= now
        if (started && startsAt.getTime() !== existing.startsAt.getTime()) {
            throw new DiscountError("this discount is already running; only its end date can move.")
        }

        await prisma.$transaction(async (tx) => {
            await tx.discount.update({ where: { id }, data: { startsAt, endsAt } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "discount.reschedule",
                    entity: "Discount",
                    entityId: id,
                    diff: {
                        name: existing.name,
                        from: { startsAt: existing.startsAt.toISOString(), endsAt: existing.endsAt.toISOString() },
                        to: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
                    },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
        return { name: existing.name }
    }

    /** Only a discount that never ran. Anything that has been live is stopped, not erased. */
    static async remove(id: string) {
        const admin = await requireCurrentAdmin()
        const existing = await prisma.discount.findUnique({ where: { id } })
        if (!existing) throw new DiscountError("that discount no longer exists.")
        if (existing.startsAt <= new Date()) {
            throw new DiscountError(
                "this discount has already started. Stop it instead — orders placed under it have to stay explicable."
            )
        }

        await prisma.$transaction(async (tx) => {
            await tx.discount.delete({ where: { id } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "discount.delete",
                    entity: "Discount",
                    entityId: id,
                    diff: {
                        name: existing.name,
                        startsAt: existing.startsAt.toISOString(),
                        endsAt: existing.endsAt.toISOString(),
                        note: "deleted before it started",
                    },
                },
            })
        })

        return { name: existing.name }
    }
}
