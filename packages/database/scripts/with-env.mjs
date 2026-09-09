#!/usr/bin/env node
import { spawn } from "node:child_process"
import { join } from "node:path"
import { assertWritable, describe, loadEnv, PACKAGE_ROOT } from "./env.mjs"

const argv = process.argv.slice(2)
const readOnly = argv[0] === "--read-only"
const [command, ...args] = readOnly ? argv.slice(1) : argv

if (!command) {
    console.error("usage: with-env.mjs [--read-only] <command> [args...]")
    process.exit(2)
}

loadEnv()

console.error(`[env] DATABASE_URL        -> ${describe(process.env.DATABASE_URL)}`)
console.error(`[env] DIRECT_DATABASE_URL -> ${describe(process.env.DIRECT_DATABASE_URL)}`)

if (!readOnly) {
    try {
        assertWritable(["DATABASE_URL", "DIRECT_DATABASE_URL"])
        console.error("[guard] OK: both targets are the branch endpoint.")
    } catch (error) {
        console.error(String(error.message))
        process.exit(1)
    }
}

const bin = join(PACKAGE_ROOT, "node_modules", ".bin", command)
const child = spawn(bin, args, { stdio: "inherit", cwd: PACKAGE_ROOT, env: process.env })
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)))
