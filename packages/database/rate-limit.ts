import type { PrismaClient, Prisma } from "./generated/prisma/client"

type Client = PrismaClient | Prisma.TransactionClient

export interface RateLimitResult {
    allowed: boolean
    count: number
    limit: number
}

export async function consume(
    client: Client,
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const rows = await client.$queryRaw<Array<{ count: number }>>`
        INSERT INTO rate_limits ("key", "count", "windowStart")
        VALUES (${key}, 1, (now() AT TIME ZONE 'UTC'))
        ON CONFLICT ("key") DO UPDATE
        SET "count" = CASE
                WHEN rate_limits."windowStart" < (now() AT TIME ZONE 'UTC') - make_interval(secs => ${windowSeconds}::double precision)
                THEN 1
                ELSE rate_limits."count" + 1
            END,
            "windowStart" = CASE
                WHEN rate_limits."windowStart" < (now() AT TIME ZONE 'UTC') - make_interval(secs => ${windowSeconds}::double precision)
                THEN (now() AT TIME ZONE 'UTC')
                ELSE rate_limits."windowStart"
            END
        RETURNING "count"`

    const count = rows[0]?.count ?? 1
    return { allowed: count <= limit, count, limit }
}

export async function sweepRateLimits(client: Client, olderThanSeconds = 86_400): Promise<number> {
    const deleted = await client.$executeRaw`
        DELETE FROM rate_limits
        WHERE "windowStart" < (now() AT TIME ZONE 'UTC') - make_interval(secs => ${olderThanSeconds}::double precision)`
    return deleted
}
