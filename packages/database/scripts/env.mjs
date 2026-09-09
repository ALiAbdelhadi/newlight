import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import dotenvFlow from "dotenv-flow"

export const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

export const PRODUCTION_ENDPOINT = "ep-round-river"
export const BRANCH_ENDPOINT = "ep-raspy-night"

export function loadEnv() {
    dotenvFlow.config({ path: PACKAGE_ROOT, silent: true })
}

function endpointOf(url) {
    if (!url) return null
    if (url.includes(PRODUCTION_ENDPOINT)) return "production"
    if (url.includes(BRANCH_ENDPOINT)) return "branch"
    if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) return "local"
    return "unknown"
}

export function describe(url) {
    if (!url) return "<unset>"
    const host = url.replace(/^.*@/, "").replace(/\/.*$/, "")
    return `${endpointOf(url)} (${host})`
}

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
