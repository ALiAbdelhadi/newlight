"use server"

import { revalidatePath } from "next/cache"

import { currentUserId } from "@/lib/auth"
import { UserService } from "@/lib/services/user-service"
import { getShippingSchema } from "@/lib/validation/shipping"

export type AddressFormState = {
    ok: boolean
    errors?: Record<string, string>
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
