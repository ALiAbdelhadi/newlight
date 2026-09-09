import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/prisma/client"

// Neon suspends an idle compute and its pooler drops every open socket when it does. A `pg`
// pool that keeps idle clients longer than that hands the next query a dead connection, which
// surfaces as "Connection terminated unexpectedly" on whatever page happens to run it. Recycle
// idle clients well before that window, keep the live ones alive, and never wait forever on a
// connect. `pg` re-dials on the next query once a dead client has been evicted.
const POOL_DEFAULTS = {
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
} as const

export function createPrismaClient(connectionString: string | undefined = process.env.DATABASE_URL): PrismaClient {
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set. Prisma 7 needs a connection string to build its driver adapter.")
    }
    return new PrismaClient({ adapter: new PrismaPg({ connectionString, ...POOL_DEFAULTS }) })
}
