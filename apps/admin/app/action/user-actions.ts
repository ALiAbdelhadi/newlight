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
