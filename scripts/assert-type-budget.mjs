#!/usr/bin/env node
/**
 * Enforces scripts/verification-budget.json.
 *
 * Runs `tsc --noEmit` per package and fails if any package exceeds its ceiling,
 * or if a package is now BELOW its ceiling (which means the budget should be
 * tightened — a stale budget is a gate that has quietly stopped biting).
 */
import { execFileSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const config = JSON.parse(readFileSync(join(repoRoot, "scripts/verification-budget.json"), "utf8"))

const PACKAGE_DIRS = {
    "@repo/database": "packages/database",
    "@repo/mail": "packages/mail",
    "@repo/notifications": "packages/notifications",
    www: "apps/www",
    admin: "apps/admin",
}

let failed = false
let stale = []

for (const [name, budget] of Object.entries(config.budgets)) {
    const dir = join(repoRoot, PACKAGE_DIRS[name])
    if (!existsSync(dir)) {
        console.error(`[budget] unknown package "${name}"`)
        failed = true
        continue
    }

    let output = ""
    try {
        execFileSync(join(repoRoot, "node_modules/.bin/tsc"), ["--noEmit"], {
            cwd: dir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        })
    } catch (error) {
        output = `${error.stdout ?? ""}${error.stderr ?? ""}`
    }

    const count = (output.match(/error TS\d+:/g) ?? []).length
    const verdict = count > budget.max ? "FAIL" : count < budget.max ? "under" : "at"

    console.log(
        `[budget] ${name.padEnd(16)} ${String(count).padStart(4)} errors / ${String(budget.max).padStart(4)} allowed  ${verdict}`
    )

    if (count > budget.max) {
        failed = true
        const lines = output.split("\n").filter((l) => /error TS\d+:/.test(l)).slice(0, 10)
        console.error(lines.map((l) => `           ${l}`).join("\n"))
    } else if (count < budget.max) {
        stale.push([name, budget.max, count])
    }
}

if (stale.length) {
    console.error("")
    console.error("[budget] FAIL: these ceilings are stale and must be tightened to the actual count:")
    for (const [name, max, count] of stale) {
        console.error(`           ${name}: ${max} -> ${count}`)
    }
    failed = true
}

process.exit(failed ? 1 : 0)
