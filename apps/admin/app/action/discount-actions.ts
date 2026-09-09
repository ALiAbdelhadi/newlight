"use server"

import { revalidatePath } from "next/cache"

import {
    DiscountError,
    DiscountService,
    type DiscountInput,
    type DiscountPreview,
    type DiscountScopeInput,
} from "@/lib/services/discount-service"
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth"
import type { DiscountKind } from "@repo/database"

/**
 * §13.2 — the discount screen's server boundary.
 *
 * Dates cross as ISO strings rather than as `Date`s. A `<input type="datetime-local">` produces
 * a local wall-clock string with no zone, and the conversion to an instant has to happen in
 * exactly one place or "the sale ends on the 15th" means two different moments in the browser
 * and in the database. The client sends `toISOString()`; this parses it and nothing else does.
 */

export interface DiscountFormInput {
    name: string
    kind: DiscountKind
    value: string
    scope: DiscountScopeInput
    /** ISO 8601, UTC. */
    startsAt: string
    endsAt: string
}

export type DiscountPreviewResult = { ok: true; preview: DiscountPreview } | { ok: false; error: string }
export type DiscountActionResult = { ok: true; message: string } | { ok: false; error: string }

function describe(error: unknown): string {
    if (error instanceof UnauthenticatedError) return "You are signed out. Sign in again."
    if (error instanceof ForbiddenError) return "Your role does not allow this."
    if (error instanceof DiscountError) return error.message
    console.error("[discount-action]", error)
    return error instanceof Error ? error.message : "Something went wrong."
}

function toInput(form: DiscountFormInput): DiscountInput {
    return {
        name: form.name,
        kind: form.kind,
        value: form.value,
        scope: form.scope,
        startsAt: new Date(form.startsAt),
        endsAt: new Date(form.endsAt),
    }
}

export async function previewDiscount(form: DiscountFormInput): Promise<DiscountPreviewResult> {
    try {
        return { ok: true, preview: await DiscountService.preview(toInput(form)) }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function createDiscount(form: DiscountFormInput): Promise<DiscountActionResult> {
    try {
        const result = await DiscountService.create(toInput(form))
        revalidatePath("/admin/products/discounts")
        return {
            ok: true,
            message: `${form.name.trim()} is set. It covers ${result.count} product${result.count === 1 ? "" : "s"}.`,
        }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function stopDiscount(id: string): Promise<DiscountActionResult> {
    try {
        const result = await DiscountService.stop(id)
        revalidatePath("/admin/products/discounts")
        return { ok: true, message: `${result.name} has been stopped. Prices are back to normal.` }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function rescheduleDiscount(
    id: string,
    startsAt: string,
    endsAt: string
): Promise<DiscountActionResult> {
    try {
        const result = await DiscountService.reschedule(id, new Date(startsAt), new Date(endsAt))
        revalidatePath("/admin/products/discounts")
        return { ok: true, message: `${result.name} now runs to a new date.` }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function deleteDiscount(id: string): Promise<DiscountActionResult> {
    try {
        const result = await DiscountService.remove(id)
        revalidatePath("/admin/products/discounts")
        return { ok: true, message: `${result.name} was deleted before it started.` }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}
