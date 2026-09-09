/**
 * Order snapshots are the one media reference `media:sync` cannot reach.
 *
 *   pnpm --filter @repo/database media:audit:orders
 *   NODE_ENV=production pnpm --filter @repo/database media:audit:orders   # reads production
 *
 * `OrderItem.productImage` is a frozen copy of the catalog path as it stood when the order
 * was placed (§24.4) — deliberately immutable, so nothing that repoints the catalog repoints
 * it. Once `apps/*\/public/products` is gone, any snapshot still holding a local path renders
 * a broken image on an order that has already been paid for.
 *
 * Read-only, and reports rather than repairs: rewriting a snapshot is a decision about an
 * immutable record, not a migration step this script gets to take on its own.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PACKAGE_ROOT } from "../media"

interface Manifest {
    entries: Record<string, { url: string | null }>
}

async function main() {
    const manifest = JSON.parse(
        readFileSync(join(PACKAGE_ROOT, "data", "media-manifest.json"), "utf8")
    ) as Manifest

    const prisma = new PrismaClient()
    const items = await prisma.orderItem.findMany({
        select: { id: true, orderId: true, productId: true, productImage: true },
        orderBy: { createdAt: "asc" },
    })

    const local = items.filter((item) => item.productImage.startsWith("/"))
    // A local path the manifest knows can be repointed mechanically; one it does not know
    // names a file that was never uploaded, and needs a human before anything else happens.
    const mappable = local.filter((item) => manifest.entries[item.productImage]?.url)
    const orphaned = local.filter((item) => !manifest.entries[item.productImage]?.url)

    console.log(`[orders] ${items.length} order items`)
    console.log(`[orders]   ${items.length - local.length} already absolute (Cloudinary or external)`)
    console.log(`[orders]   ${local.length} still holding a local path`)
    console.log(`[orders]     ${mappable.length} of those map to an uploaded manifest entry`)
    console.log(`[orders]     ${orphaned.length} map to nothing the manifest knows`)

    for (const item of orphaned.slice(0, 10)) {
        console.log(`[orders]       order ${item.orderId} · ${item.productId} — ${item.productImage}`)
    }
    if (orphaned.length > 10) console.log(`[orders]       … and ${orphaned.length - 10} more`)

    // Broken images on historical orders are a defect whether or not they are repairable, so
    // any local path at all is a non-zero exit.
    if (local.length > 0) process.exitCode = 1

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error(`[orders] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
