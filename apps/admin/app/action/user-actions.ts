"use server"

import { currentAdmin } from "@/lib/auth"
import { prisma } from "@repo/database"

export interface UserInfo {
    id: string
    name: string
    email: string
    imageUrl?: string
    phoneNumber?: string
    preferredLanguage: string
    preferredCurrency: string
}

export async function getCurrentUserInfo(): Promise<UserInfo | null> {
    const admin = await currentAdmin()
    if (!admin) return null

    // Name and email come from OUR user row now, not from an identity provider's copy of
    // them. Clerk's firstName/lastName had no column here, so the join that reconstructed a
    // display name is gone — `name` is one field, and it is the field the panel edits.
    const dbUser = await prisma.user.findUnique({
        where: { id: admin.id },
        select: { phoneNumber: true, preferredLanguage: true, preferredCurrency: true, image: true },
    })

    return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        imageUrl: dbUser?.image ?? undefined,
        phoneNumber: dbUser?.phoneNumber ?? undefined,
        preferredLanguage: dbUser?.preferredLanguage ?? "ar",
        preferredCurrency: dbUser?.preferredCurrency ?? "EGP",
    }
}

// syncUserWithDatabase() is deleted (§7). It upserted a user row from a Clerk id on first
// sight — one of the lazy-create sites the spec names. There is nothing left to sync: Better
// Auth writes the user row itself, in this database, at registration.
