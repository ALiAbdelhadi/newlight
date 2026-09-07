import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PACKAGE_ROOT } from "../media"

/**
 * A disposable PostgreSQL database, per test run — BUILD §11.
 *
 * The contract is deliberately "give me a Postgres I may create databases on", not
 * "testcontainers". Testcontainers needs a running Docker daemon and pulls an image; a Neon
 * branch per run needs an API key nobody has here. A base URL covers all three: a local
 * server, a CI service container, or a testcontainer someone else started — and the tests do
 * not have to know which.
 *
 *   TEST_DATABASE_URL=postgresql://user@localhost:5432/postgres pnpm test
 *
 * Each run creates `newlight_test_<random>`, applies the REAL migration chain to it — not
 * `db push`, which would test a schema no deployment ever produces — and drops it afterwards.
 */

const MIGRATIONS = join(PACKAGE_ROOT, "prisma", "migrations")

export interface TestDatabase {
    url: string
    name: string
    prisma: PrismaClient
    drop(): Promise<void>
}

function baseUrl(): string {
    const url = process.env.TEST_DATABASE_URL
    if (!url) {
        throw new Error(
            "TEST_DATABASE_URL is not set.\n" +
                "Point it at a PostgreSQL server this run may create and drop databases on:\n" +
                "  TEST_DATABASE_URL=postgresql://$USER@localhost:5432/postgres pnpm test"
        )
    }
    return url
}

function adminClient(): PrismaClient {
    return new PrismaClient({ datasources: { db: { url: baseUrl() } } })
}

function withDatabase(url: string, name: string): string {
    const parsed = new URL(url)
    parsed.pathname = `/${name}`
    return parsed.toString()
}

/**
 * Applies the chain with `psql`-free execution: each migration is one multi-statement script,
 * sent through the Prisma client on the new database. `0011` is included — the guard inside it
 * short-circuits on an empty products table, which is exactly the case here.
 */
async function applyMigrations(url: string): Promise<string[]> {
    const applied: string[] = []
    const names = readdirSync(MIGRATIONS, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\d{4}_/.test(entry.name))
        .map((entry) => entry.name)
        .sort()

    for (const name of names) {
        const sql = readFileSync(join(MIGRATIONS, name, "migration.sql"), "utf8")
        execFileSync(
            join(PACKAGE_ROOT, "node_modules", ".bin", "prisma"),
            ["db", "execute", "--url", url, "--stdin"],
            { input: sql, stdio: ["pipe", "ignore", "pipe"], cwd: PACKAGE_ROOT }
        )
        applied.push(name)
    }
    return applied
}

export async function createTestDatabase(): Promise<TestDatabase> {
    const name = `newlight_test_${randomBytes(6).toString("hex")}`
    const admin = adminClient()
    try {
        await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`)
    } finally {
        await admin.$disconnect()
    }

    const url = withDatabase(baseUrl(), name)
    await applyMigrations(url)

    const prisma = new PrismaClient({ datasources: { db: { url } } })
    return {
        url,
        name,
        prisma,
        async drop() {
            await prisma.$disconnect()
            const cleanup = adminClient()
            try {
                // Terminate anything still attached, or DROP DATABASE blocks forever and the
                // suite hangs instead of failing.
                await cleanup.$executeRawUnsafe(
                    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${name}' AND pid <> pg_backend_pid()`
                )
                await cleanup.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}"`)
            } finally {
                await cleanup.$disconnect()
            }
        },
    }
}
