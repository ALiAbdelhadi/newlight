#!/usr/bin/env node
/**
 * Applies the migration chain up to (and including) a named migration.
 *
 *   node scripts/migrate-to.mjs 0010_order_lifecycle_and_configuration
 *   node scripts/migrate-to.mjs --all
 *   node scripts/migrate-to.mjs --baseline 0000_baseline_production
 *
 * `prisma migrate deploy` applies everything pending, and this chain cannot be applied
 * all at once: 0011_drop_v1_catalog_columns destroys the data the P2 transform reads and
 * refuses to run before it. So P1 stops at 0010 and P2 finishes the chain.
 *
 * `--baseline` records a migration as applied WITHOUT running it, for a database that
 * already holds that shape (the branch, restored from a production snapshot).
 *
 * Every write goes through the §0.4 target guard in env.mjs.
 */
import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assertWritable, describe, loadEnv, PACKAGE_ROOT } from "./env.mjs"

const MIGRATIONS = join(PACKAGE_ROOT, "prisma", "migrations")
const prisma = join(PACKAGE_ROOT, "node_modules", ".bin", "prisma")

const argv = process.argv.slice(2)
const baselineMode = argv[0] === "--baseline"
const target = baselineMode ? argv[1] : argv[0]

if (!target) {
    console.error("usage: migrate-to.mjs [--baseline] <migration-name> | --all")
    process.exit(2)
}

loadEnv()
console.error(`[env] DATABASE_URL        -> ${describe(process.env.DATABASE_URL)}`)
console.error(`[env] DIRECT_DATABASE_URL -> ${describe(process.env.DIRECT_DATABASE_URL)}`)

try {
    assertWritable(["DATABASE_URL", "DIRECT_DATABASE_URL"])
} catch (error) {
    console.error(String(error.message))
    process.exit(1)
}

const url = process.env.DIRECT_DATABASE_URL // migrations never run over the pooler (A14)
const all = readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort()

if (target !== "--all" && !all.includes(target)) {
    console.error(`[migrate-to] unknown migration "${target}". Known:\n  ${all.join("\n  ")}`)
    process.exit(2)
}

const applied = new Set(all.filter((name) => !listPending().includes(name)))
const wanted = target === "--all" ? all : all.slice(0, all.indexOf(target) + 1)

for (const name of wanted) {
    if (applied.has(name)) {
        console.log(`[migrate-to] skip     ${name} (already applied)`)
        continue
    }
    if (baselineMode) {
        console.log(`[migrate-to] baseline ${name} (recorded, NOT executed)`)
        run(prisma, ["migrate", "resolve", "--applied", name])
        continue
    }
    console.log(`[migrate-to] apply    ${name}`)
    execute(join(MIGRATIONS, name, "migration.sql"))
    run(prisma, ["migrate", "resolve", "--applied", name])
}

const held = all.filter((name) => !wanted.includes(name))
if (held.length) {
    console.log(`[migrate-to] held back on purpose: ${held.join(", ")}`)
}

/**
 * `prisma db execute` does not wrap a script in a transaction, so a migration that failed
 * halfway would leave the database in a state no migration describes. Wrapping it means a
 * failed migration changes nothing and can simply be re-run after the cause is fixed.
 */
function execute(file) {
    const dir = mkdtempSync(join(tmpdir(), "nl-migrate-"))
    const wrapped = join(dir, "migration.sql")
    writeFileSync(wrapped, `BEGIN;\n${readFileSync(file, "utf8")}\nCOMMIT;\n`)
    run(prisma, ["db", "execute", "--url", url, "--file", wrapped])
}

/**
 * Derived from `prisma migrate status`, which reports what is NOT applied rather than what
 * is. Inverting its answer is the reliable direction: a name it does not mention as pending
 * is one the database has already recorded.
 */
function listPending() {
    let output = ""
    try {
        output = execFileSync(prisma, ["migrate", "status"], {
            cwd: PACKAGE_ROOT,
            encoding: "utf8",
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
        })
    } catch (error) {
        // `migrate status` exits non-zero whenever anything is pending, which is this
        // chain's normal state; its stdout is still the answer.
        output = `${error.stdout ?? ""}${error.stderr ?? ""}`
    }
    if (/have not yet been applied/i.test(output)) {
        return all.filter((name) => new RegExp(`\\b${name}\\b`).test(output))
    }
    if (/up to date|No pending migrations/i.test(output)) return []
    // Anything else (no migrations table yet, an unreadable database) means nothing has
    // been applied. Guessing "already applied" here would silently skip real work.
    return [...all]
}

function run(bin, args) {
    execFileSync(bin, args, { cwd: PACKAGE_ROOT, stdio: "inherit", env: process.env })
}
