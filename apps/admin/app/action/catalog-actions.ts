"use server"

import { revalidatePath } from "next/cache"
import type { Locale } from "@repo/database"
import { CatalogService, CatalogError } from "@/lib/services/catalog-service"
import { TranslationService, type TranslationFields } from "@/lib/services/translation-service"
import { InventoryService } from "@/lib/services/inventory-service"
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth"

/**
 * Server actions for the product workbench.
 *
 * Every one returns `{ ok }` rather than throwing, because these are called from form
 * submissions and a thrown server action reaches the user as a generic digest with the actual
 * reason stripped out — which is the opposite of what a refusal like "12 order items refer to
 * this product" is for. Authorisation failures are the exception in spirit but not in shape:
 * the services already throw them, and they are converted here into a message the admin can
 * act on.
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

async function run(fn: () => Promise<string | void>): Promise<ActionResult> {
    try {
        const message = await fn()
        return { ok: true, message: message ?? undefined }
    } catch (error) {
        if (error instanceof UnauthenticatedError) return { ok: false, error: "You are signed out. Sign in again." }
        if (error instanceof ForbiddenError) return { ok: false, error: "Your role does not allow this." }
        if (error instanceof CatalogError) return { ok: false, error: error.message }
        console.error("[catalog-action]", error)
        return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." }
    }
}

export async function saveTranslations(
    productId: string,
    input: Record<Locale, TranslationFields>
): Promise<ActionResult> {
    return run(async () => {
        await TranslationService.saveProduct(productId, input)
        revalidatePath(`/admin/products/${productId}`)
        return "Both languages saved."
    })
}

export async function renameProduct(productId: string, slug: string): Promise<ActionResult> {
    return run(async () => {
        const result = await CatalogService.rename(productId, slug)
        revalidatePath(`/admin/products/${productId}`)
        return result.changed ? `Slug is now ${result.slug}; the old URL redirects.` : "Slug unchanged."
    })
}

export async function softDeleteProduct(productId: string): Promise<ActionResult> {
    return run(async () => {
        await CatalogService.softDelete(productId)
        revalidatePath("/admin/products")
        revalidatePath(`/admin/products/${productId}`)
        return "Archived. Orders that mention it still read correctly, and it can be restored."
    })
}

export async function restoreProduct(productId: string): Promise<ActionResult> {
    return run(async () => {
        await CatalogService.restore(productId)
        revalidatePath("/admin/products")
        revalidatePath(`/admin/products/${productId}`)
        return "Restored. It is still inactive until you activate it."
    })
}

export async function setProductActive(productId: string, isActive: boolean): Promise<ActionResult> {
    return run(async () => {
        // Deliberately not in CatalogService: this is a visibility toggle, not a lifecycle
        // event, and giving it an audit action would make `product.soft_delete` ambiguous.
        const { prisma } = await import("@repo/database")
        const { requireCurrentAdmin } = await import("@/lib/auth")
        await requireCurrentAdmin()
        await prisma.product.update({ where: { id: productId }, data: { isActive } })
        const { revalidateStorefront } = await import("@/lib/revalidate")
        await revalidateStorefront({ kind: "all" })
        revalidatePath(`/admin/products/${productId}`)
        return isActive ? "Visible on the storefront." : "Hidden from the storefront."
    })
}

export async function hardDeleteProduct(productId: string): Promise<ActionResult> {
    return run(async () => {
        await CatalogService.hardDelete(productId)
        revalidatePath("/admin/products")
        return "Permanently deleted."
    })
}

export async function adjustStock(productId: string, quantity: number, reason: string): Promise<ActionResult> {
    return run(async () => {
        if (!Number.isInteger(quantity) || quantity === 0) throw new Error("Enter a whole number that is not zero.")
        await InventoryService.adjust({ productId, quantity, reason })
        revalidatePath(`/admin/products/${productId}`)
        return `Ledger entry written: ${quantity > 0 ? "+" : ""}${quantity}.`
    })
}

export async function recordDamage(productId: string, quantity: number, reason: string): Promise<ActionResult> {
    return run(async () => {
        if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Enter how many units were lost.")
        await InventoryService.recordDamage({ productId, quantity, reason })
        revalidatePath(`/admin/products/${productId}`)
        return `Damage recorded: −${quantity}.`
    })
}

export async function receiveStock(
    productId: string,
    quantity: number,
    unitCost: string | null,
    reason: string
): Promise<ActionResult> {
    return run(async () => {
        await InventoryService.receivePurchase({
            productId,
            quantity,
            // An empty box means "not recorded", which is a different claim from zero.
            unitCost: unitCost && unitCost.trim() !== "" ? unitCost.trim() : null,
            reason: reason.trim() || "purchase receipt",
        })
        revalidatePath(`/admin/products/${productId}`)
        return unitCost ? `Received ${quantity}; average cost updated.` : `Received ${quantity}; no cost recorded.`
    })
}

/**
 * §8.4 bulk cost entry. One transaction per product rather than one for the batch: a typo in
 * row 40 must not roll back the 39 receipts that were right, and every row is its own ledger
 * movement anyway.
 */
export async function bulkReceiveStock(
    rows: Array<{ productId: string; quantity: number; unitCost: string | null }>
): Promise<ActionResult> {
    return run(async () => {
        const failures: string[] = []
        let received = 0

        for (const row of rows) {
            try {
                await InventoryService.receivePurchase({
                    productId: row.productId,
                    quantity: row.quantity,
                    unitCost: row.unitCost && row.unitCost.trim() !== "" ? row.unitCost.trim() : null,
                    reason: "bulk receipt",
                })
                received += 1
            } catch (error) {
                failures.push(`${row.productId}: ${error instanceof Error ? error.message : "failed"}`)
            }
        }

        if (failures.length > 0) {
            // Partial success reported as partial, not as success.
            throw new Error(`${received} received, ${failures.length} failed — ${failures.slice(0, 3).join("; ")}`)
        }
        return `${received} receipt(s) recorded.`
    })
}

export async function completeOpeningStocktake(): Promise<ActionResult> {
    return run(async () => {
        await InventoryService.completeOpeningStocktake()
        revalidatePath("/admin/inventory")
        return "Opening count closed. Valuation and margin reports will now produce numbers."
    })
}

/** Edit one product's price. Routed through PricingService so it lands in the price history. */
export async function setProductPrice(productId: string, amount: string): Promise<ActionResult> {
    return run(async () => {
        const { PricingService } = await import("@/lib/services/pricing-service")
        const result = await PricingService.setPrice(productId, amount)
        revalidatePath(`/admin/products/${productId}`)
        revalidatePath("/admin/products")
        return result.changed ? `Price is now ${result.price}.` : "Price unchanged."
    })
}

/** Edit a product's specifications. */
export async function saveProductSpecs(
    productId: string,
    specs: Array<{ key: string; valueEn: string | null; valueAr: string | null }>
): Promise<ActionResult> {
    return run(async () => {
        const { SpecService } = await import("@/lib/services/spec-service")
        const result = await SpecService.save(productId, specs)
        revalidatePath(`/admin/products/${productId}`)
        return result.changed === 0 ? "No changes." : `${result.changed} specification(s) saved.`
    })
}

/**
 * Create a product. Returns its id so the caller can go straight to the workbench — the next
 * thing it needs is a photograph, and that is where photographs live.
 */
export async function createProductAction(
    input: import("@/lib/services/catalog-service").NewProductInput
): Promise<ActionResult & { productId?: string }> {
    try {
        const { createProduct } = await import("@/lib/services/catalog-service")
        const product = await createProduct(input)
        revalidatePath("/admin/products")
        return { ok: true, message: `${product.productId} created. Add a photo, then activate it.`, productId: product.id }
    } catch (error) {
        const { CatalogCreationError } = await import("@/lib/services/catalog-service")
        if (error instanceof UnauthenticatedError) return { ok: false, error: "You are signed out. Sign in again." }
        if (error instanceof ForbiddenError) return { ok: false, error: "Your role does not allow this." }
        if (error instanceof CatalogCreationError) return { ok: false, error: error.message }
        console.error("[catalog-action] create", error)
        return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." }
    }
}
