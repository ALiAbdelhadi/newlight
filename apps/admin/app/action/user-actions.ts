"use server"

import { currentUser } from "@clerk/nextjs/server"
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
    try {
        const clerkUser = await currentUser()

        if (!clerkUser) {
            return null
        }

        const dbUser = await prisma.user.findUnique({
            where: {
                id: clerkUser.id,
            },
            select: {
                phoneNumber: true,
                preferredLanguage: true,
                preferredCurrency: true,
            },
        })

        const name = [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(" ") || "Admin User"

        const email = clerkUser.emailAddresses[0]?.emailAddress || "No email"

        return {
            id: clerkUser.id,
            name,
            email,
            imageUrl: clerkUser.imageUrl,
            phoneNumber: dbUser?.phoneNumber || undefined,
            preferredLanguage: dbUser?.preferredLanguage || "ar",
            preferredCurrency: dbUser?.preferredCurrency || "EGP",
        }
    } catch (error) {
        console.error("Error fetching user info:", error)
        return null
    }
}


export async function syncUserWithDatabase(clerkUserId: string, email: string) {
    try {
        await prisma.user.upsert({
            where: {
                id: clerkUserId,
            },
            update: {
                email,
                updatedAt: new Date(),
            },
            create: {
                id: clerkUserId,
                email,
                preferredLanguage: "ar",
                preferredCurrency: "EGP",
            },
        })
    } catch (error) {
        console.error("Error syncing user with database:", error)
    }
}