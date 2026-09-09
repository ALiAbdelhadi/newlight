#!/usr/bin/env node
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

const url = process.env.DIRECT_DATABASE_URL
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

function execute(file) {
    const dir = mkdtempSync(join(tmpdir(), "nl-migrate-"))
    const wrapped = join(dir, "migration.sql")
    writeFileSync(wrapped, `BEGIN;\n${readFileSync(file, "utf8")}\nCOMMIT;\n`)
    run(prisma, ["db", "execute", "--file", wrapped], { PRISMA_DATASOURCE_URL: url })
}

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
        output = `${error.stdout ?? ""}${error.stderr ?? ""}`
    }
    if (/have not yet been applied/i.test(output)) {
        return all.filter((name) => new RegExp(`\\b${name}\\b`).test(output))
    }
    if (/up to date|No pending migrations/i.test(output)) return []
    return [...all]
}

function run(bin, args, extraEnv = {}) {
    execFileSync(bin, args, { cwd: PACKAGE_ROOT, stdio: "inherit", env: { ...process.env, ...extraEnv } })
}
