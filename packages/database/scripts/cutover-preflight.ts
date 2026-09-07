/**
 * Cutover preflight — BUILD §13 / §20, ADR 0006.
 *
 *   pnpm --filter @repo/database cutover:preflight
 *
 * Read-only. It answers one question: is everything that CAN be verified from here, verified?
 *
 * Two kinds of check, kept visibly apart:
 *
 *   AUTOMATIC  — read from the database, the manifest or the filesystem. A red one is a fact.
 *   MANUAL     — cannot be read from this environment (Neon console, Resend dashboard). These
 *                are printed as OPEN and never inferred. A preflight that guessed at PITR
 *                retention would be a preflight that certifies a rollback nobody has.
 *
 * It never writes, never promotes, and never touches production. Promotion is a Neon console
 * action taken by a person who has read this output.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PACKAGE_ROOT, REPO_ROOT } from "../media"

type Status = "ok" | "fail" | "manual"

interface Check {
    id: string
    label: string
    status: Status
    detail: string
}

/** Read from disk rather than hard-coded: the chain grows, and a stale constant here would
 * report a correct database as broken — or worse, a short chain as complete. */
const EXPECTED_MIGRATIONS = readdirSync(join(PACKAGE_ROOT, "prisma", "migrations")).filter((name) =>
    existsSync(join(PACKAGE_ROOT, "prisma", "migrations", name, "migration.sql"))
).length

const checks: Check[] = []
function record(id: string, label: string, status: Status, detail: string) {
    checks.push({ id, label, status, detail })
}

function ageInHours(path: string): number {
    return (Date.now() - statSync(path).mtimeMs) / 3_600_000
}

async function main() {
    const prisma = new PrismaClient()

    // --- §20 condition 2: a catalog export exists -----------------------------------------
    const exportPath = join(PACKAGE_ROOT, "data", "catalog-export.json")
    if (!existsSync(exportPath)) {
        record("20.2", "catalog export exists", "fail", "packages/database/data/catalog-export.json is missing")
    } else {
        const hours = ageInHours(exportPath)
        const parsed = JSON.parse(readFileSync(exportPath, "utf8")) as { products?: unknown[] }
        const count = Array.isArray(parsed.products) ? parsed.products.length : 0
        // Age matters: the export is the thing a restore restores. A stale one restores a
        // stale catalog and reports success while doing it.
        record(
            "20.2",
            "catalog export exists",
            hours <= 24 ? "ok" : "fail",
            `${count} products, ${hours.toFixed(1)}h old (must be re-exported inside the cutover window)`
        )
    }

    // --- §15: media is on Cloudinary ------------------------------------------------------
    const manifestPath = join(PACKAGE_ROOT, "data", "media-manifest.json")
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        provider: string
        entries: Record<string, { publicId: string; url: string | null }>
    }
    const files = new Set(Object.values(manifest.entries).map((e) => e.publicId))
    const uploaded = new Set(Object.values(manifest.entries).filter((e) => e.url).map((e) => e.publicId))
    record(
        "15.1",
        "media manifest fully uploaded",
        uploaded.size === files.size && manifest.provider === "cloudinary" ? "ok" : "fail",
        `${uploaded.size}/${files.size} distinct files uploaded, provider "${manifest.provider}"`
    )

    // --- §15: and the catalog actually points at it ---------------------------------------
    const [imageTotal, imageLocal] = await Promise.all([
        prisma.productImage.count(),
        prisma.productImage.count({ where: { url: { startsWith: "/" } } }),
    ])
    record(
        "15.2",
        "catalog images point at Cloudinary",
        imageLocal === 0 ? "ok" : "fail",
        `${imageTotal - imageLocal}/${imageTotal} remote; ${imageLocal} still local (run \`pnpm media:sync\`)`
    )

    // --- §13: the branch is fully migrated ------------------------------------------------
    const applied = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
    const appliedCount = Number(applied[0]?.count ?? 0)
    record(
        "13.1",
        "branch has the whole migration chain",
        appliedCount === EXPECTED_MIGRATIONS ? "ok" : "fail",
        `${appliedCount}/${EXPECTED_MIGRATIONS} migrations applied`
    )

    // --- §13: the v2 catalog reconciles ---------------------------------------------------
    const [products, specs, translations, images, priceSum] = await Promise.all([
        prisma.product.count(),
        prisma.productSpec.count(),
        prisma.productTranslation.count(),
        prisma.productImage.count(),
        prisma.$queryRaw<Array<{ sum: string | null }>>`SELECT sum(price)::text AS sum FROM products`,
    ])
    // The numbers P1 reconciled against production. They are the transform's contract.
    const expected = { products: 189, specs: 2051, translations: 378, priceSum: "232454.00" }
    const reconciled =
        products === expected.products &&
        specs === expected.specs &&
        translations === expected.translations &&
        priceSum[0]?.sum === expected.priceSum
    record(
        "13.2",
        "catalog reconciles with production",
        reconciled ? "ok" : "fail",
        `products ${products}/${expected.products}, specs ${specs}/${expected.specs}, ` +
            `translations ${translations}/${expected.translations}, price sum ${priceSum[0]?.sum ?? "?"}/${expected.priceSum}, ` +
            `images ${images}`
    )

    // --- §7: someone can actually sign in after cutover -----------------------------------
    const admins = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } })
    record("7.1", "an administrator exists", admins > 0 ? "ok" : "fail", `${admins} admin account(s)`)

    // --- N1: the opening count is an explicit state, not a silence ------------------------
    const opening = await prisma.systemSetting.findUnique({
        where: { key: "inventory.opening_count_pending" },
        select: { value: true },
    })
    record(
        "N1",
        "opening stocktake state is recorded",
        opening ? "ok" : "fail",
        opening?.value === "true"
            ? "pending — valuation and margin will refuse to produce a number until it is closed"
            : "closed"
    )

    // --- §20: is the legacy JSON still load-bearing? --------------------------------------
    //
    // The files stay in the repository until all seven conditions close (A13) — this checks
    // the one that is a fact about the code rather than about a backup: whether anything
    // still reads them. A file nothing imports is dead weight; a file something imports is a
    // second source of truth, which is the thing §20 exists to end.
    const legacyDir = join(REPO_ROOT, "apps", "www", "data")
    const legacyFiles = existsSync(legacyDir) ? readdirSync(legacyDir).filter((f) => f.endsWith(".json")) : []
    let referencing = ""
    if (legacyFiles.length > 0) {
        try {
            referencing = execFileSync(
                "grep",
                // This file names the legacy files in order to look for them, so it excludes itself.
                ["-rIl", "--exclude-dir=node_modules", "--exclude-dir=.next", "--exclude-dir=data",
                 "--exclude=cutover-preflight.ts",
                 "products-details", join(REPO_ROOT, "apps"), join(REPO_ROOT, "packages")],
                { encoding: "utf8" }
            ).trim()
        } catch {
            // grep exits 1 when it matches nothing, which is the answer we want.
            referencing = ""
        }
    }
    record(
        "20.1",
        "legacy JSON is no longer read by any code",
        referencing === "" ? "ok" : "fail",
        legacyFiles.length === 0
            ? "already retired"
            : `${legacyFiles.length} file(s) still present${referencing ? `, referenced by: ${referencing.split("\n").join(", ")}` : ", referenced by nothing"}`
    )

    // --- The ones this environment cannot see ---------------------------------------------
    record(
        "20.5",
        "Neon PITR retention confirmed",
        "manual",
        "read the retention window in the Neon console; ADR 0006 rollback is the old endpoint, but PITR is the floor under it"
    )
    record(
        "20.7",
        "restore proven into an empty database",
        "manual",
        "P1 proved this once (189/2051/232454.00). Re-prove it against the export taken inside the cutover window"
    )
    record("P2.1", "Resend sending domain verified", "manual", "until then mail is queued and logged, not delivered")
    record(
        "P5.1",
        "seeded SUPER_ADMIN password rotated",
        "manual",
        "it was printed to a terminal and is in a session transcript"
    )

    await prisma.$disconnect()

    // --- Report ---------------------------------------------------------------------------
    const symbol = { ok: "ok  ", fail: "FAIL", manual: "OPEN" } as const
    console.log("")
    console.log("  Cutover preflight — ADR 0006, Option A (promote the transformed branch)")
    console.log("")
    for (const check of checks) {
        console.log(`  [${symbol[check.status]}] ${check.id.padEnd(6)} ${check.label}`)
        console.log(`               ${check.detail}`)
    }

    const failed = checks.filter((c) => c.status === "fail")
    const manual = checks.filter((c) => c.status === "manual")
    console.log("")
    console.log(`  ${checks.length - failed.length - manual.length} passing, ${failed.length} failing, ${manual.length} needing a person`)
    console.log("")

    if (failed.length > 0) {
        console.log("  NOT READY. Failing checks are facts, not warnings:")
        for (const check of failed) console.log(`    - ${check.id} ${check.label}`)
        console.log("")
        process.exitCode = 1
    } else {
        // Deliberately not "READY". Every manual check is a thing a person has to have done,
        // and a script that declares readiness on their behalf is how they get skipped.
        console.log("  Every automatic check passes. The OPEN items above are not optional —")
        console.log("  confirm each one yourself before promoting the branch.")
        console.log("")
    }
}

main().catch((error) => {
    console.error(`[preflight] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
