import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createPrismaClient } from "../prisma-client"
import { PACKAGE_ROOT } from "../media"

interface Entry {
    publicId: string
    url: string | null
    blurDataUrl: string | null
    width: number | null
    height: number | null
}

interface Manifest {
    provider: "local" | "cloudinary"
    entries: Record<string, Entry>
}

async function main() {
    const dry = process.argv.includes("--dry")
    const manifest = JSON.parse(
        readFileSync(join(PACKAGE_ROOT, "data", "media-manifest.json"), "utf8")
    ) as Manifest

    const byPublicId = new Map<string, Entry>()
    for (const entry of Object.values(manifest.entries)) {
        if (entry.url) byPublicId.set(entry.publicId, entry)
    }

    const byPath = new Map<string, Entry>()
    for (const [path, entry] of Object.entries(manifest.entries)) {
        if (entry.url) byPath.set(path, entry)
    }

    const uploaded = byPublicId.size
    const total = new Set(Object.values(manifest.entries).map((e) => e.publicId)).size
    console.log(`[sync] manifest: ${uploaded}/${total} distinct files have a URL (provider "${manifest.provider}")`)

    if (uploaded === 0) {
        console.error("[sync] nothing to sync. Run `pnpm media:upload` first.")
        process.exit(1)
    }

    const prisma = createPrismaClient()
    const images = await prisma.productImage.findMany({
        select: { id: true, publicId: true, url: true, blurDataUrl: true, width: true, height: true },
    })

    let updated = 0
    let alreadyCorrect = 0
    const unmatched: string[] = []

    for (const image of images) {
        const entry = image.publicId ? byPublicId.get(image.publicId) : undefined
        if (!entry) {
            unmatched.push(`${image.publicId ?? "(no publicId)"} — ${image.url}`)
            continue
        }
        if (image.url === entry.url && image.blurDataUrl === entry.blurDataUrl) {
            alreadyCorrect++
            continue
        }
        if (!dry) {
            await prisma.productImage.update({
                where: { id: image.id },
                data: {
                    url: entry.url!,
                    blurDataUrl: entry.blurDataUrl,
                    width: image.width ?? entry.width,
                    height: image.height ?? entry.height,
                },
            })
        }
        updated++
    }

    let taxonomyUpdated = 0
    let taxonomyCorrect = 0
    const taxonomyUnmatched: string[] = []

    const categories = await prisma.category.findMany({ select: { id: true, imageUrl: true } })
    const subCategories = await prisma.subCategory.findMany({ select: { id: true, imageUrl: true } })
    const taxonomy = [
        ...categories.map((row) => ({ ...row, model: "category" as const })),
        ...subCategories.map((row) => ({ ...row, model: "subCategory" as const })),
    ]

    for (const row of taxonomy) {
        if (!row.imageUrl || !row.imageUrl.startsWith("/")) {
            if (row.imageUrl) taxonomyCorrect++
            continue
        }
        const entry = byPath.get(row.imageUrl)
        if (!entry) {
            taxonomyUnmatched.push(`${row.model} ${row.id} — ${row.imageUrl}`)
            continue
        }
        if (!dry) {
            if (row.model === "category") {
                await prisma.category.update({ where: { id: row.id }, data: { imageUrl: entry.url! } })
            } else {
                await prisma.subCategory.update({ where: { id: row.id }, data: { imageUrl: entry.url! } })
            }
        }
        taxonomyUpdated++
    }

    console.log("")
    console.log(`[sync] ${images.length} catalog images`)
    console.log(`[sync]   ${updated} ${dry ? "would be updated" : "updated"}`)
    console.log(`[sync]   ${alreadyCorrect} already pointing at Cloudinary`)
    console.log(`[sync]   ${unmatched.length} with no uploaded manifest entry`)
    for (const line of unmatched.slice(0, 10)) console.log(`[sync]     ${line}`)
    if (unmatched.length > 10) console.log(`[sync]     … and ${unmatched.length - 10} more`)

    console.log("")
    console.log(`[sync] ${taxonomy.length} category/subcategory thumbnails`)
    console.log(`[sync]   ${taxonomyUpdated} ${dry ? "would be updated" : "updated"}`)
    console.log(`[sync]   ${taxonomyCorrect} already pointing at Cloudinary`)
    console.log(`[sync]   ${taxonomyUnmatched.length} with no uploaded manifest entry`)
    for (const line of taxonomyUnmatched.slice(0, 10)) console.log(`[sync]     ${line}`)

    if (unmatched.length > 0 || taxonomyUnmatched.length > 0) process.exitCode = 1

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error(`[sync] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
