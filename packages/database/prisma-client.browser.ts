import type { PrismaClient } from "./generated/prisma/client"

export function createPrismaClient(): PrismaClient {
    return new Proxy({} as PrismaClient, {
        get() {
            throw new Error("@repo/database: the Prisma client is server-only and cannot run in the browser.")
        },
    })
}
