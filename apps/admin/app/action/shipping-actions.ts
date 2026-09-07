"use server"

import { revalidatePath } from "next/cache"
import type { ShippingOption } from "@repo/database"
import { ShippingService, ShippingError } from "@/lib/services/shipping-service"
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth"
import type { ActionResult } from "@/app/action/catalog-actions"

export async function setShippingRate(option: ShippingOption, amount: string): Promise<ActionResult> {
    try {
        const value = await ShippingService.setRate(option, amount)
        revalidatePath("/admin/shipping")
        return { ok: true, message: `${option} is now ${value}. It applies to the next order placed.` }
    } catch (error) {
        if (error instanceof UnauthenticatedError) return { ok: false, error: "You are signed out. Sign in again." }
        if (error instanceof ForbiddenError) return { ok: false, error: "Your role does not allow this." }
        if (error instanceof ShippingError) return { ok: false, error: error.message }
        console.error("[shipping-action]", error)
        return { ok: false, error: "Something went wrong." }
    }
}
