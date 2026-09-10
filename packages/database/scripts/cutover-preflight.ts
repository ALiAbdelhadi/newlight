import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { createPrismaClient } from "../prisma-client"
import { PACKAGE_ROOT, REPO_ROOT } from "../media"

type Status = "ok" | "fail" | "manual"

interface Check {
    id: string
    label: string
    status: Status
    detail: string
}

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
    const prisma = createPrismaClient()

    const exportPath = join(PACKAGE_ROOT, "data", "catalog-export.json")
    if (!existsSync(exportPath)) {
        record("20.2", "catalog export exists", "fail", "packages/database/data/catalog-export.json is missing")
    } else {
        const hours = ageInHours(exportPath)
        const parsed = JSON.parse(readFileSync(exportPath, "utf8")) as { products?: unknown[] }
        const count = Array.isArray(parsed.products) ? parsed.products.length : 0
        record(
            "20.2",
            "catalog export exists",
            hours <= 24 ? "ok" : "fail",
            `${count} products, ${hours.toFixed(1)}h old (must be re-exported inside the cutover window)`
        )
    }

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

    const applied = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
    const appliedCount = Number(applied[0]?.count ?? 0)
    record(
        "13.1",
        "branch has the whole migration chain",
        appliedCount === EXPECTED_MIGRATIONS ? "ok" : "fail",
        `${appliedCount}/${EXPECTED_MIGRATIONS} migrations applied`
    )

    const [products, specs, translations, images, priceSum] = await Promise.all([
        prisma.product.count(),
        prisma.productSpec.count(),
        prisma.productTranslation.count(),
        prisma.productImage.count(),
        prisma.$queryRaw<Array<{ sum: string | null }>>`SELECT sum(price)::text AS sum FROM products`,
    ])
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

    const admins = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } })
    record("7.1", "an administrator exists", admins > 0 ? "ok" : "fail", `${admins} admin account(s)`)

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

    const legacyDir = join(REPO_ROOT, "apps", "www", "data")
    const legacyFiles = existsSync(legacyDir) ? readdirSync(legacyDir).filter((f) => f.endsWith(".json")) : []
    let referencing = ""
    if (legacyFiles.length > 0) {
        try {
            referencing = execFileSync(
                "grep",
                ["-rIl", "--exclude-dir=node_modules", "--exclude-dir=.next", "--exclude-dir=data",
                 "--exclude=cutover-preflight.ts",
                 "products-details", join(REPO_ROOT, "apps"), join(REPO_ROOT, "packages")],
                { encoding: "utf8" }
            ).trim()
        } catch {
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
    const mailFrom = process.env.EMAIL_FROM
    const resendKey = process.env.RESEND_API_KEY
    const selected = mailFrom && resendKey ? "resend" : "console"
    record(
        "P2.1",
        "mail transport delivers rather than logs",
        selected === "console" ? "fail" : "ok",
        selected === "console"
            ? `EMAIL_FROM${mailFrom ? " is set" : " is not set"}, RESEND_API_KEY${resendKey ? " is set" : " is not set"} — @repo/mail falls back to the console transport and nothing is delivered. Checked in this environment; the deployment that runs the outbox cron needs the same variables`
            : `${selected} transport selected. Checked in this environment; confirm the same variables on the deployment that runs the outbox cron, and that the EMAIL_FROM domain is verified in Resend`
    )
    record(
        "P5.1",
        "seeded SUPER_ADMIN password rotated",
        "manual",
        "it was printed to a terminal and is in a session transcript"
    )

    await prisma.$disconnect()

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
        console.log("  Every automatic check passes. The OPEN items above are not optional —")
        console.log("  confirm each one yourself before promoting the branch.")
        console.log("")
    }
}

main().catch((error) => {
    console.error(`[preflight] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
