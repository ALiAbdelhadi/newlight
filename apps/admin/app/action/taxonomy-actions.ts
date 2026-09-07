"use server"

import { revalidatePath } from "next/cache"
import { TaxonomyService, TaxonomyError, type TaxonomyInput } from "@/lib/services/taxonomy-service"
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth"
import type { ActionResult } from "@/app/action/catalog-actions"

function describe(error: unknown): string {
    if (error instanceof UnauthenticatedError) return "You are signed out. Sign in again."
    if (error instanceof ForbiddenError) return "Your role does not allow this."
    if (error instanceof TaxonomyError) return error.message
    console.error("[taxonomy-action]", error)
    return error instanceof Error ? error.message : "Something went wrong."
}

type Result = ActionResult & { id?: string }

async function run(fn: () => Promise<string | { id: string; message: string }>): Promise<Result> {
    try {
        const outcome = await fn()
        revalidatePath("/admin/taxonomy")
        return typeof outcome === "string"
            ? { ok: true, message: outcome }
            : { ok: true, message: outcome.message, id: outcome.id }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function createCategory(input: TaxonomyInput): Promise<Result> {
    return run(async () => {
        const created = await TaxonomyService.createCategory(input)
        return { id: created.id, message: "Category created." }
    })
}

export async function updateCategory(id: string, input: TaxonomyInput): Promise<Result> {
    return run(async () => {
        const { renamed } = await TaxonomyService.updateCategory(id, input)
        return renamed.length > 0
            ? `Saved. ${renamed.length} URL(s) changed — the old ones redirect.`
            : "Saved."
    })
}

export async function createSubCategory(categoryId: string, input: TaxonomyInput): Promise<Result> {
    return run(async () => {
        const created = await TaxonomyService.createSubCategory(categoryId, input)
        return { id: created.id, message: "Sub-category created." }
    })
}

export async function updateSubCategory(id: string, categoryId: string, input: TaxonomyInput): Promise<Result> {
    return run(async () => {
        const { renamed } = await TaxonomyService.updateSubCategory(id, categoryId, input)
        return renamed.length > 0
            ? `Saved. ${renamed.length} URL(s) changed — the old ones redirect.`
            : "Saved."
    })
}

export async function archiveCategory(id: string): Promise<Result> {
    return run(async () => {
        await TaxonomyService.archiveCategory(id)
        return "Archived. It can be restored."
    })
}

export async function archiveSubCategory(id: string): Promise<Result> {
    return run(async () => {
        await TaxonomyService.archiveSubCategory(id)
        return "Archived. It can be restored."
    })
}

export async function restoreTaxonomy(kind: "category" | "subCategory", id: string): Promise<Result> {
    return run(async () => {
        await TaxonomyService.restore(kind, id)
        return "Restored. It is still hidden until you activate it."
    })
}
