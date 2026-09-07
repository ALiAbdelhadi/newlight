import type { PrismaClient, Prisma } from "@prisma/client"

/**
 * Rate limiting that survives a cold start.
 *
 * The contact form counted requests in a module-level `Map`. That is per-instance and reset on
 * every cold start, so on serverless each new instance started every caller at zero — close to
 * no limit at all, on the one unauthenticated write endpoint the storefront has.
 *
 * A single row is the state every instance can agree on. It is not Redis; it is one indexed
 * upsert on a table that already has to be reachable for the request to do anything.
 */

type Client = PrismaClient | Prisma.TransactionClient

export interface RateLimitResult {
    allowed: boolean
    /** How many requests this key has made inside the current window, including this one. */
    count: number
    limit: number
}

/**
 * Count one request against `key` and say whether it is allowed.
 *
 * The whole decision is ONE statement, so two instances racing cannot both read 2 and both
 * write 3. `ON CONFLICT DO UPDATE` serialises them on the row, and the window either continues
 * or restarts inside the same update.
 *
 * `now() AT TIME ZONE 'UTC'` rather than `now()`: `windowStart` is `timestamp` WITHOUT time
 * zone and Prisma writes UTC into it, so a bare `now()` compares a timestamptz against a UTC
 * value through the session timezone. On a machine set to Africa/Cairo that is three hours of
 * error — enough to make every window look expired, which is the defect P4 found three times
 * elsewhere (A55).
 */
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

/**
 * Delete counters whose window closed long ago.
 *
 * Not on the request path: a limiter that pays for a cleanup on every call is a limiter that
 * makes the endpoint it protects slower. The reservation sweep already runs hourly and this
 * rides along with it.
 */
export async function sweepRateLimits(client: Client, olderThanSeconds = 86_400): Promise<number> {
    const deleted = await client.$executeRaw`
        DELETE FROM rate_limits
        WHERE "windowStart" < (now() AT TIME ZONE 'UTC') - make_interval(secs => ${olderThanSeconds}::double precision)`
    return deleted
}
