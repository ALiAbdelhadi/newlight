import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { PrismaClient } from "@prisma/client"
import { collectReferences, loadOverrides, loadTrees, PACKAGE_ROOT, readDimensions, REPO_ROOT, resolve, sniff } from "../media"

const prisma = new PrismaClient()

async function auditV2(): Promise<never> {
    const manifestFile = join(PACKAGE_ROOT, "data", "media-manifest.json")
    if (!existsSync(manifestFile)) {
        console.error("[media] this database is pure v2 and there is no manifest to check it against.")
        process.exit(1)
    }
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as {
        provider: string
        entries: Record<string, { publicId: string; url: string | null }>
    }
    const knownPublicIds = new Set(Object.values(manifest.entries).map((e) => e.publicId))

    const images = await prisma.productImage.findMany({
        select: { id: true, productId: true, publicId: true, url: true, order: true, width: true, height: true },
        orderBy: [{ productId: "asc" }, { order: "asc" }],
    })
    const products = await prisma.product.count()
    const withoutPrimary = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n FROM products p
         WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i."productId" = p.id AND i."order" = 0)`

    const unknown = images.filter((i) => !knownPublicIds.has(i.publicId))
    const local = images.filter((i) => i.url.startsWith("/"))
    const noDimensions = images.filter((i) => i.width === null || i.height === null)

    console.log(`[media] post-0011 audit: ${images.length} ProductImage rows across ${products} products`)
    console.log(`[media]   manifest provider                    : ${manifest.provider}`)
    console.log(`[media]   publicIds not in the manifest        : ${unknown.length}`)
    console.log(`[media]   urls that are still local paths      : ${local.length}`)
    console.log(`[media]   rows with no dimensions              : ${noDimensions.length}`)
    console.log(`[media]   products with no order=0 primary     : ${Number(withoutPrimary[0]!.n)}`)
    for (const image of unknown.slice(0, 10)) console.error(`          UNKNOWN ${image.productId} ${image.publicId}`)

    await prisma.$disconnect()
    const failed = unknown.length > 0 || Number(withoutPrimary[0]!.n) > 0
    if (failed) {
        console.error(`\n[media] GATE RED.`)
        process.exit(1)
    }
    if (local.length) {
        console.log(`\n[media] GATE AMBER: every image resolves, but ${local.length} url(s) are local paths.`)
        console.log(`[media] Run \`media:upload\` with the Cloudinary credentials, then re-run the transform.`)
        process.exit(0)
    }
    console.log(`\n[media] GATE GREEN: every ProductImage points at a manifest-backed Cloudinary URL.`)
    process.exit(0)
}

async function main() {
    const v1 = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'images'`
    if (Number(v1[0]!.n) === 0) return auditV2()

    const trees = loadTrees()
    const overrides = loadOverrides()
    for (const tree of trees) {
        console.log(`[media] ${tree.name.padEnd(5)} ${String(tree.files.size).padStart(4)} files under ${relative(REPO_ROOT, tree.root)}`)
    }

    const references = await collectReferences(prisma)
    const resolutions = resolve(references, trees, overrides)

    const unresolved = resolutions.filter((r) => !r.file)
    const viaAdmin = resolutions.filter((r) => r.source === "admin" && r.via === "exact")
    const viaOverride = resolutions.filter((r) => r.via === "override")
    const distinct = new Set(resolutions.map((r) => r.path))

    console.log(`\n[media] ${references.length} references (${distinct.size} distinct) across ${new Set(references.map((r) => r.product)).size} products`)
    console.log(`[media]   resolved exact in www   : ${resolutions.filter((r) => r.source === "www" && r.via === "exact").length}`)
    console.log(`[media]   resolved exact in admin : ${viaAdmin.length}   <- files that exist ONLY in the admin tree`)
    console.log(`[media]   resolved via override   : ${viaOverride.length}`)
    console.log(`[media]   UNRESOLVED              : ${unresolved.length}`)

    if (viaAdmin.length) {
        console.log(`\n[media] union hits taken from apps/admin/public (never applied silently):`)
        for (const r of viaAdmin) console.log(`          ${r.product.padEnd(18)} ${r.path}`)
    }
    for (const level of ["mechanical", "needs-review"] as const) {
        const group = viaOverride.filter((r) => r.override!.confidence === level)
        if (!group.length) continue
        console.log(
            level === "mechanical"
                ? `\n[media] overrides applied (mechanical — no judgement involved):`
                : `\n[media] overrides applied (NEEDS REVIEW — these assign photographs to a product):`
        )
        for (const r of group) {
            console.log(`          ${r.product.padEnd(18)} ${r.path}`)
            console.log(`          ${"".padEnd(18)}   -> [${r.source}] ${r.override!.to}  (${r.override!.class})`)
        }
    }
    if (unresolved.length) {
        console.log(`\n[media] UNRESOLVED — the §15.2 gate is RED until these exist:`)
        for (const r of unresolved) console.log(`          ${r.product.padEnd(18)} ${r.path}`)
    }

    const lying = new Map<string, number>()
    let unreadable = 0
    const referenced = new Set(resolutions.filter((r) => r.file).map((r) => r.file!))
    for (const tree of trees) {
        for (const [path, file] of tree.files) {
            if (!/\.(png|jpe?g|webp)$/i.test(path)) continue
            const declared = /\.jpe?g$/i.test(path) ? "jpeg" : path.split(".").pop()!.toLowerCase()
            const actual = sniff(readFileSync(file).subarray(0, 32))
            if (actual === "unknown") unreadable++
            else if (actual !== declared) {
                const shape = `.${declared} that is actually ${actual}`
                lying.set(shape, (lying.get(shape) ?? 0) + 1)
            }
        }
    }
    console.log(`\n[media] ${[...lying.values()].reduce((a, b) => a + b, 0)} files whose extension contradicts their magic bytes:`)
    for (const [shape, count] of lying) console.log(`          ${String(count).padStart(3)} × ${shape}`)
    console.log(`[media] Content type comes from sniffing, never from the path.`)

    let noDimensions = 0
    let bytes = 0
    const hashes = new Map<string, number>()
    for (const file of referenced) {
        const buffer = readFileSync(file)
        bytes += statSync(file).size
        if (!readDimensions(buffer)) {
            noDimensions++
            console.log(`          no readable dimensions: ${relative(REPO_ROOT, file)}`)
        }
        const hash = createHash("sha256").update(buffer).digest("hex")
        hashes.set(hash, (hashes.get(hash) ?? 0) + 1)
    }
    console.log(`\n[media] ${referenced.size} distinct files back those references`)
    console.log(`[media]   dimensions unreadable   : ${noDimensions}`)
    console.log(`[media]   files with no readable magic bytes anywhere in the trees : ${unreadable}`)
    console.log(`[media]   content hashes at more than one path : ${[...hashes.values()].filter((n) => n > 1).length}`)
    console.log(`[media]   ${(bytes / 1024 / 1024).toFixed(1)} MB to upload`)

    const orphans = trees.flatMap((tree) =>
        [...tree.files.entries()].filter(([path, file]) => path.startsWith("/products/") && !referenced.has(file))
    )
    console.log(`[media]   ${orphans.length} files under /products that no product references (reported, NOT deleted)`)

    await prisma.$disconnect()
    if (unresolved.length) {
        console.error(`\n[media] GATE RED: ${unresolved.length} reference(s) resolve to nothing.`)
        process.exit(1)
    }
    console.log(`\n[media] GATE GREEN: every referenced image resolves.`)
}

main()
