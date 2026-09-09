#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadEnv, describe, PACKAGE_ROOT } from "./env.mjs"

const keepDump = process.argv.includes("--keep-dump")
const DB = "newlight_rehearsal"
const localAdmin = `postgresql://${process.env.USER}@localhost:5432/postgres`
const localTarget = `postgresql://${process.env.USER}@localhost:5432/${DB}`

if (!/@(localhost|127\.0\.0\.1):/.test(localTarget)) {
    console.error("[rehearse] the target must be on localhost. Refusing.")
    process.exit(1)
}

function sh(command, args, env = {}) {
    return execFileSync(command, args, { stdio: "inherit", cwd: PACKAGE_ROOT, env: { ...process.env, ...env } })
}
function quiet(command, args, env = {}) {
    return execFileSync(command, args, { encoding: "utf8", cwd: PACKAGE_ROOT, env: { ...process.env, ...env } })
}

process.env.NODE_ENV = "production"
loadEnv()
const production = process.env.DIRECT_DATABASE_URL
if (!production) {
    console.error("[rehearse] DIRECT_DATABASE_URL is not set in .env.production.")
    process.exit(1)
}
console.log(`[rehearse] source: ${describe(production)} (read-only — pg_dump cannot write)`)

const workdir = mkdtempSync(join(tmpdir(), "nl-rehearse-"))
const dump = join(workdir, "production.dump")
sh("pg_dump", [production, "--no-owner", "--no-privileges", "--format=custom", "--file", dump])

console.log(`[rehearse] restoring into ${DB} on localhost`)
quiet("psql", [localAdmin, "-qc", `DROP DATABASE IF EXISTS ${DB};`, "-c", `CREATE DATABASE ${DB};`])
quiet("pg_restore", ["--no-owner", "--no-privileges", "-d", localTarget, dump])

const env = { DATABASE_URL: localTarget, DIRECT_DATABASE_URL: localTarget }
const before = quiet("psql", [localTarget, "-tAc", "select count(*), sum(price)::text from products"], env).trim()
console.log(`[rehearse] restored: ${before.replace("|", " products, price sum ")}`)

console.log("\n[rehearse] baseline 0000 (recorded, not executed)")
sh("node", ["scripts/migrate-to.mjs", "--baseline", "0000_baseline_production"], env)

console.log("\n[rehearse] migrate 0001 -> 0010")
sh("node", ["scripts/migrate-to.mjs", "0010_order_lifecycle_and_configuration"], env)

console.log("\n[rehearse] transform")
const started = Date.now()
sh(join(PACKAGE_ROOT, "node_modules", ".bin", "tsx"), ["scripts/transform-v1-to-v2.ts"], env)
const seconds = ((Date.now() - started) / 1000).toFixed(1)

console.log("\n[rehearse] migrate 0011 -> 0013")
sh("node", ["scripts/migrate-to.mjs", "0013_better_auth"], env)

console.log("\n[rehearse] schema check")
let drift = "none"
try {
    quiet(join(PACKAGE_ROOT, "node_modules", ".bin", "prisma"), [
        "migrate", "diff",
        "--from-url", localTarget,
        "--to-schema-datamodel", "prisma/schema.prisma",
        "--exit-code",
    ], env)
} catch {
    drift = "DRIFT — the chain does not reproduce schema.prisma"
}

console.log("")
console.log(`  transform took ${seconds}s locally`)
console.log(`  schema: ${drift === "none" ? "reproduces schema.prisma exactly" : drift}`)
console.log("")
console.log("  A local rehearsal proves the SEQUENCE and the NUMBERS. It cannot predict the")
console.log("  duration against Neon: the transform is round-trip bound, so its real cost is")
console.log("  latency × requests, and both of those change with where it runs from.")
console.log("")

if (!keepDump) rmSync(workdir, { recursive: true, force: true })
else console.log(`  dump kept at ${dump}`)

if (drift !== "none") process.exit(1)
