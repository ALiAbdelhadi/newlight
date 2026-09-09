import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/prisma/client"

export function createPrismaClient(connectionString: string | undefined = process.env.DATABASE_URL): PrismaClient {
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set. Prisma 7 needs a connection string to build its driver adapter.")
    }
    return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}
