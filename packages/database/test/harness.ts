import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { createPrismaClient } from "../prisma-client"

import type { PrismaClient } from "../generated/prisma/client"
import { PACKAGE_ROOT } from "../media"

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
    return createPrismaClient(baseUrl())
}

function withDatabase(url: string, name: string): string {
    const parsed = new URL(url)
    parsed.pathname = `/${name}`
    return parsed.toString()
}

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
            ["db", "execute", "--stdin"],
            {
                input: sql,
                stdio: ["pipe", "ignore", "pipe"],
                cwd: PACKAGE_ROOT,
                env: { ...process.env, PRISMA_DATASOURCE_URL: url },
            }
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

    const prisma = createPrismaClient(url)
    return {
        url,
        name,
        prisma,
        async drop() {
            await prisma.$disconnect()
            const cleanup = adminClient()
            try {
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
