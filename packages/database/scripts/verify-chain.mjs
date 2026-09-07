#!/usr/bin/env node
/**
 * Proves that replaying prisma/migrations from empty produces EXACTLY schema.prisma.
 *
 *   SHADOW_DATABASE_URL=postgresql://user@localhost:5432/newlight_shadow \
 *     node scripts/verify-chain.mjs
 *
 * Without this, "the schema" and "the migrations" are two independent descriptions of the
 * database that are assumed to agree. They drift the first time someone edits one of them.
 *
 * SHADOW_DATABASE_URL must be a THROWAWAY database: Prisma resets it. It is required
 * explicitly, with no default, because a default here is one typo away from resetting a
 * database that matters. The §0.4 guard refuses production and the branch outright.
 */
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { describe, loadEnv, PACKAGE_ROOT } from "./env.mjs"

/**
 * CHECK constraints Prisma cannot express and `migrate diff` cannot see (BUILD §4.6).
 * Because the diff is blind to them, nothing else would notice one going missing — so
 * they are asserted by name here, against the replayed chain.
 */
const REQUIRED_CHECKS = [
    ["products", "products_price_positive"],
    ["stock_levels", "stock_levels_on_hand_non_negative"],
    ["stock_levels", "stock_levels_reserved_non_negative"],
    ["stock_levels", "stock_levels_reserved_within_stock"],
    ["rate_limits", "rate_limits_count_non_negative"],
]

loadEnv()

const shadow = process.env.SHADOW_DATABASE_URL
if (!shadow) {
    console.error("[chain] SHADOW_DATABASE_URL is not set.")
    console.error("[chain] Point it at an empty, disposable PostgreSQL database; Prisma resets it.")
    console.error("[chain]   createdb newlight_shadow")
    console.error("[chain]   SHADOW_DATABASE_URL=postgresql://$USER@localhost:5432/newlight_shadow pnpm db:verify-chain")
    process.exit(2)
}

const target = describe(shadow)
if (target.startsWith("production") || target.startsWith("branch")) {
    console.error(`[chain] REFUSED: SHADOW_DATABASE_URL points at ${target}, which Prisma would RESET.`)
    process.exit(1)
}
console.error(`[chain] shadow -> ${target}`)

const diff = execFileSync(
    join(PACKAGE_ROOT, "node_modules", ".bin", "prisma"),
    [
        "migrate", "diff",
        "--from-migrations", "./prisma/migrations",
        "--to-schema-datamodel", "./prisma/schema.prisma",
        "--shadow-database-url", shadow,
        "--script",
    ],
    { cwd: PACKAGE_ROOT, encoding: "utf8", env: process.env }
)

if (!/This is an empty migration/.test(diff)) {
    console.error("[chain] FAIL: the migration chain does not reproduce schema.prisma.")
    console.error("[chain] The statements below are what the chain is MISSING:")
    console.error(diff)
    process.exit(1)
}
console.log("[chain] OK: replaying every migration from empty reproduces schema.prisma exactly.")

// `migrate diff` leaves the replayed chain in the shadow database, so it can be inspected
// for the objects the diff itself ignores.
const prisma = new PrismaClient({ datasources: { db: { url: shadow } } })
try {
    const rows = await prisma.$queryRaw`
        SELECT conrelid::regclass::text AS "table", conname AS "name"
          FROM pg_constraint
         WHERE contype = 'c' AND connamespace = 'public'::regnamespace`
    const found = new Set(rows.map((row) => `${row.table}.${row.name}`))
    const missing = REQUIRED_CHECKS.filter(([table, name]) => !found.has(`${table}.${name}`))

    if (missing.length) {
        console.error("[chain] FAIL: §4.6 check constraints are missing from the replayed chain:")
        for (const [table, name] of missing) console.error(`           ${table}.${name}`)
        process.exit(1)
    }
    console.log(`[chain] OK: all ${REQUIRED_CHECKS.length} §4.6 check constraints present.`)
} finally {
    await prisma.$disconnect()
}
