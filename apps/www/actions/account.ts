"use server"

import { revalidatePath } from "next/cache"

import { currentUserId } from "@/lib/auth"
import { UserService } from "@/lib/services/user-service"
import { getShippingSchema } from "@/lib/validation/shipping"

/**
 * The account page's mutations.
 *
 * Both derive the user from the SESSION, not from an argument. `actions/order.ts` has a
 * `saveShippingAddress(userId, data)` whose first parameter arrives from the browser — the
 * checkout form passes the id it was rendered with, so in practice it is the right one, but a
 * server action is an HTTP endpoint and its parameters are a request body. These take none.
 */

export type AddressFormState = {
    ok: boolean
    /** Field name → message, from the locale's own schema so the copy is already translated. */
    errors?: Record<string, string>
    /** A failure that is not the customer's input. */
    error?: string
}

export async function saveMyShippingAddress(locale: string, input: unknown): Promise<AddressFormState> {
    const userId = await currentUserId()
    if (!userId) return { ok: false, error: "unauthenticated" }

    const parsed = getShippingSchema(locale).safeParse(input)
    if (!parsed.success) {
        const errors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
            const key = issue.path[0]
            if (typeof key === "string" && !errors[key]) errors[key] = issue.message
        }
        return { ok: false, errors }
    }

    try {
        await UserService.saveShippingAddress(userId, parsed.data)
    } catch {
        return { ok: false, error: "failed" }
    }

    revalidatePath("/account")
    return { ok: true }
}

export async function deleteMyShippingAddress(): Promise<AddressFormState> {
    const userId = await currentUserId()
    if (!userId) return { ok: false, error: "unauthenticated" }

    try {
        await UserService.deleteShippingAddress(userId)
    } catch {
        return { ok: false, error: "failed" }
    }

    revalidatePath("/account")
    return { ok: true }
}
