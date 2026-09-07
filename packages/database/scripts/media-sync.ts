/**
 * Point the catalog at Cloudinary — BUILD §15, the step after `media:upload`.
 *
 *   pnpm --filter @repo/database media:sync [--dry]
 *
 * The transform writes `ProductImage.url = entry.url ?? path`, so a catalog transformed while
 * the manifest was still local holds LOCAL paths and the correct `publicId`. That publicId is
 * derived from the file, not from Cloudinary, which is what makes this possible at all: the
 * rows can be matched to manifest entries after the fact, and the URLs filled in, without
 * re-running the transform — which is impossible on a database that has already had `0011`
 * applied, because the v1 columns the transform reads are gone.
 *
 * Idempotent: a row whose url already matches is left alone and counted separately, so a
 * second run reports `0 updated` rather than looking like it did the work twice.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
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

    // Keyed by publicId, because that is what the catalog rows carry. Several catalog paths
    // can share one file, and they share its publicId too.
    const byPublicId = new Map<string, Entry>()
    for (const entry of Object.values(manifest.entries)) {
        if (entry.url) byPublicId.set(entry.publicId, entry)
    }

    const uploaded = byPublicId.size
    const total = new Set(Object.values(manifest.entries).map((e) => e.publicId)).size
    console.log(`[sync] manifest: ${uploaded}/${total} distinct files have a URL (provider "${manifest.provider}")`)

    if (uploaded === 0) {
        console.error("[sync] nothing to sync. Run `pnpm media:upload` first.")
        process.exit(1)
    }

    const prisma = new PrismaClient()
    const images = await prisma.productImage.findMany({
        select: { id: true, publicId: true, url: true, blurDataUrl: true, width: true, height: true },
    })

    let updated = 0
    let alreadyCorrect = 0
    const unmatched: string[] = []

    for (const image of images) {
        const entry = image.publicId ? byPublicId.get(image.publicId) : undefined
        if (!entry) {
            // Either the file has not been uploaded yet, or the row's publicId is not one the
            // manifest knows. Reported, never guessed at.
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
                    // Dimensions come from the local file and are already right; filled only
                    // when the row has none, so a re-scan never silently rewrites them.
                    width: image.width ?? entry.width,
                    height: image.height ?? entry.height,
                },
            })
        }
        updated++
    }

    console.log("")
    console.log(`[sync] ${images.length} catalog images`)
    console.log(`[sync]   ${updated} ${dry ? "would be updated" : "updated"}`)
    console.log(`[sync]   ${alreadyCorrect} already pointing at Cloudinary`)
    console.log(`[sync]   ${unmatched.length} with no uploaded manifest entry`)
    for (const line of unmatched.slice(0, 10)) console.log(`[sync]     ${line}`)
    if (unmatched.length > 10) console.log(`[sync]     … and ${unmatched.length - 10} more`)

    // A catalog that is only partly on Cloudinary is a catalog that breaks the moment the
    // local files stop being served, so it is a non-zero exit rather than a note.
    if (unmatched.length > 0) process.exitCode = 1

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error(`[sync] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
