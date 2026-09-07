/**
 * Environment loading and database-target guards for @repo/database.
 *
 * Prisma's CLI only reads `.env`; this repo keeps `.env.local` (branch) and
 * `.env.production` (production), so every CLI entry point goes through here.
 *
 * BUILD §0.4: `ep-round-river` is read-only until P6. Intent is not enough —
 * anything write-capable asserts its target at runtime.
 */
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import dotenvFlow from "dotenv-flow"

export const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

export const PRODUCTION_ENDPOINT = "ep-round-river"
export const BRANCH_ENDPOINT = "ep-raspy-night"

/** Load .env / .env.local (or .env.production when NODE_ENV=production). */
export function loadEnv() {
    dotenvFlow.config({ path: PACKAGE_ROOT, silent: true })
}

function endpointOf(url) {
    if (!url) return null
    if (url.includes(PRODUCTION_ENDPOINT)) return "production"
    if (url.includes(BRANCH_ENDPOINT)) return "branch"
    // A database on this machine is not production and cannot become production. Recognising
    // it is what lets the §20 restore proof run somewhere disposable; it is not a way to
    // reach a remote host, which still has to be the branch by name.
    if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) return "local"
    return "unknown"
}

/** Human-readable target of a connection string, with credentials stripped. */
export function describe(url) {
    if (!url) return "<unset>"
    const host = url.replace(/^.*@/, "").replace(/\/.*$/, "")
    return `${endpointOf(url)} (${host})`
}

/**
 * Throw unless every supplied connection string points somewhere safe to write.
 * `names` are env var names, for the error message.
 */
export function assertWritable(names) {
    for (const name of names) {
        const url = process.env[name]
        if (!url) {
            throw new Error(`[guard] ${name} is not set. Refusing to run a write-capable command.`)
        }
        const target = endpointOf(url)
        if (target === "production") {
            throw new Error(
                `[guard] REFUSED: ${name} points at ${PRODUCTION_ENDPOINT} (production).\n` +
                    `Production is read-only until P6 (BUILD §0.4). Run against ${BRANCH_ENDPOINT}.`
            )
        }
        if (target !== "branch" && target !== "local") {
            throw new Error(
                `[guard] REFUSED: ${name} points at an unrecognised endpoint (${describe(url)}).\n` +
                    `Write-capable commands may only target ${BRANCH_ENDPOINT} or a database on this machine.`
            )
        }
    }
}

/** Assert a read-only source really is production, and a destination really is not. */
export function assertTransformTargets({ sourceName, destinationName }) {
    const source = process.env[sourceName]
    const destination = process.env[destinationName]

    if (!source || !destination) {
        throw new Error(`[guard] both ${sourceName} and ${destinationName} must be set.`)
    }
    if (endpointOf(source) !== "production") {
        throw new Error(`[guard] ${sourceName} must be production; got ${describe(source)}.`)
    }
    if (endpointOf(destination) !== "branch") {
        throw new Error(`[guard] ${destinationName} must be the branch; got ${describe(destination)}.`)
    }
    if (source === destination) {
        throw new Error("[guard] source and destination are the same database.")
    }
}

export function requireFile(relativePath) {
    const full = join(PACKAGE_ROOT, relativePath)
    if (!existsSync(full)) {
        throw new Error(`[guard] required file missing: ${relativePath}`)
    }
    return full
}
