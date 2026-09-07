#!/usr/bin/env node
/**
 * Guards the §0.2 verification gate.
 *
 * `turbo run <task>` exits 0 when no package defines the script, which made
 * `pnpm check-types` pass while executing nothing. This asserts that at least
 * `minimum` packages actually have the script before the real run starts.
 *
 * Usage: node scripts/assert-turbo-tasks.mjs <task> <minimum>
 */
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const [task, minimumRaw] = process.argv.slice(2)

if (!task || !minimumRaw) {
    console.error("usage: assert-turbo-tasks.mjs <task> <minimum>")
    process.exit(2)
}

const minimum = Number.parseInt(minimumRaw, 10)

if (!Number.isInteger(minimum) || minimum < 1) {
    console.error(`invalid minimum: ${minimumRaw}`)
    process.exit(2)
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const localTurbo = join(repoRoot, "node_modules", ".bin", "turbo")
const turboBin = existsSync(localTurbo) ? localTurbo : "turbo"

let plan

try {
    const stdout = execFileSync(turboBin, ["run", task, "--dry=json"], {
        encoding: "utf8",
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
    })
    plan = JSON.parse(stdout)
} catch (error) {
    console.error(`[gate] could not plan "${task}": ${error.message}`)
    process.exit(1)
}

const executable = (plan.tasks ?? []).filter((t) => t.command && t.command !== "<NONEXISTENT>")

if (executable.length < minimum) {
    const missing = (plan.tasks ?? [])
        .filter((t) => !t.command || t.command === "<NONEXISTENT>")
        .map((t) => `  - ${t.taskId} (no "${task}" script)`)

    console.error(
        `[gate] FAIL: "${task}" would execute in ${executable.length} package(s), ` +
            `minimum is ${minimum}.\n` +
            `A task that runs nowhere exits 0 and verifies nothing.\n` +
            (missing.length ? `Packages without the script:\n${missing.join("\n")}\n` : "")
    )
    process.exit(1)
}

console.log(
    `[gate] OK: "${task}" executes in ${executable.length} package(s): ` +
        executable.map((t) => t.taskId).join(", ")
)
