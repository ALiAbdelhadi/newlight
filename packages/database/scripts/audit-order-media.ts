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

    if (local.length > 0) process.exitCode = 1

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error(`[orders] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
