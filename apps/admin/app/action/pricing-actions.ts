"use server"

import { revalidatePath } from "next/cache"
import {
    PricingService,
    PricingError,
    type PricingFormula,
    type PricingPreview,
    type PricingScope,
} from "@/lib/services/pricing-service"
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth"

/**
 * §13.2 item 1. Two actions on purpose: the preview mints a token over the exact prices it
 * showed you, and the apply hands it back. A single "reprice" action would be a bulk write
 * nobody had seen the effect of, which is the tool the owner already has — psql.
 */

export type PreviewResult = { ok: true; preview: PricingPreview } | { ok: false; error: string }
export type ApplyResult = { ok: true; message: string } | { ok: false; error: string }

function describe(error: unknown): string {
    if (error instanceof UnauthenticatedError) return "You are signed out. Sign in again."
    if (error instanceof ForbiddenError) return "Your role does not allow this."
    if (error instanceof PricingError) return error.message
    console.error("[pricing-action]", error)
    return error instanceof Error ? error.message : "Something went wrong."
}

export async function previewPricing(scope: PricingScope, formula: PricingFormula): Promise<PreviewResult> {
    try {
        return { ok: true, preview: await PricingService.preview(scope, formula) }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function applyPricing(
    scope: PricingScope,
    formula: PricingFormula,
    token: string
): Promise<ApplyResult> {
    try {
        const result = await PricingService.apply(scope, formula, token)
        revalidatePath("/admin/products")
        return { ok: true, message: `${result.count} price${result.count === 1 ? "" : "s"} changed.` }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}
