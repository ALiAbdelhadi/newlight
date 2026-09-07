/**
 * Cloudinary migration — BUILD §15.
 *
 *   pnpm --filter @repo/database media:scan     # local only, no credentials needed
 *   pnpm --filter @repo/database media:upload   # needs CLOUDINARY_*
 *   pnpm --filter @repo/database media:verify   # every URL returns 200
 *
 * Split into two phases on purpose. The expensive, deterministic work — resolving every
 * catalog path, reading dimensions, deriving a stable public_id, hashing — needs no
 * credentials and can be reviewed before a single byte leaves the machine. Uploading is then
 * a thin, resumable pass that only fills in `url` and `blurDataUrl`.
 *
 * The manifest is COMMITTED and is what the transform consumes; the transform never calls
 * Cloudinary (§15.1). It is keyed by the catalog path, so a lookup is exactly the string
 * stored in Product.images.
 *
 * Idempotent: public_id is derived from the resolved file, so re-running overwrites in place
 * and never duplicates. Resumable: an entry whose sha256 is unchanged and whose url is
 * already set is skipped.
 *
 * No Cloudinary SDK. The upload API is a signed multipart POST; adding a dependency to make
 * one HTTP call would hide the one part of this worth reading.
 */
import { createHash } from "node:crypto"
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { PrismaClient } from "@prisma/client"
import {
    loadOverrides,
    loadTrees,
    PACKAGE_ROOT,
    publicIdFor,
    readDimensions,
    REPO_ROOT,
    resolve,
    sniff,
    type ContentType,
    type Tree,
    type TreeName,
    collectReferences,
} from "../media"

const MANIFEST = join(PACKAGE_ROOT, "data", "media-manifest.json")

interface Entry {
    publicId: string
    /** Repo-relative path of the file that backs this catalog path. */
    file: string
    source: TreeName
    via: "exact" | "override"
    contentType: ContentType
    width: number | null
    height: number | null
    bytes: number
    sha256: string
    url: string | null
    blurDataUrl: string | null
    uploadedAt: string | null
}

interface Manifest {
    $comment: string[]
    version: number
    generatedAt: string
    /** "local" until every entry has a Cloudinary URL. */
    provider: "local" | "cloudinary"
    entries: Record<string, Entry>
}

function readManifest(): Manifest | null {
    return existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest) : null
}

/** Written via a temp file and renamed, so a crash mid-write never leaves a partial manifest. */
function writeManifest(manifest: Manifest): void {
    const temp = `${MANIFEST}.tmp`
    writeFileSync(temp, `${JSON.stringify(manifest, null, 2)}\n`)
    renameSync(temp, MANIFEST)
}

async function scan(): Promise<void> {
    const prisma = new PrismaClient()
    const trees = loadTrees()
    const references = await collectReferences(prisma)
    await prisma.$disconnect()

    const resolutions = resolve(references, trees, loadOverrides())
    const unresolved = resolutions.filter((r) => !r.file)
    if (unresolved.length) {
        console.error(`[media] REFUSING to scan: ${unresolved.length} reference(s) resolve to nothing.`)
        console.error(`[media] Run \`pnpm media:audit\` — the §15.2 gate has to be green first.`)
        process.exit(1)
    }

    const previous = readManifest()
    const treeByName = new Map<TreeName, Tree>(trees.map((t) => [t.name, t]))
    const entries: Record<string, Entry> = {}
    const idOwner = new Map<string, string>()
    let carried = 0

    for (const resolution of resolutions) {
        if (entries[resolution.path]) continue // several colours may name the same path
        const file = resolution.file!
        const buffer = readFileSync(file)
        const sha256 = createHash("sha256").update(buffer).digest("hex")
        const dimensions = readDimensions(buffer)
        const publicId = publicIdFor(treeByName.get(resolution.source!)!, file)

        // A public_id collision would silently overwrite one photograph with another.
        const owner = idOwner.get(publicId)
        if (owner && owner !== sha256) {
            console.error(`[media] REFUSING: public_id "${publicId}" is claimed by two different files.`)
            process.exit(1)
        }
        idOwner.set(publicId, sha256)

        // Carry an existing upload forward only when the bytes are unchanged.
        const before = previous?.entries[resolution.path]
        const reusable = before?.url && before.sha256 === sha256 && before.publicId === publicId
        if (reusable) carried++

        entries[resolution.path] = {
            publicId,
            file: relative(REPO_ROOT, file),
            source: resolution.source!,
            via: resolution.via!,
            contentType: sniff(buffer),
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
            bytes: buffer.length,
            sha256,
            url: reusable ? before!.url : null,
            blurDataUrl: reusable ? before!.blurDataUrl : null,
            uploadedAt: reusable ? before!.uploadedAt : null,
        }
    }

    const uploaded = Object.values(entries).filter((e) => e.url).length
    writeManifest({
        $comment: [
            "Generated by scripts/media-migrate.ts. Committed, and consumed by the transform.",
            "Keyed by the catalog path exactly as stored in Product.images / Product.colorImageMap.",
            "",
            "publicId is derived from the RESOLVED FILE, not the catalog path, so two catalog",
            "paths that name one photograph share a public_id and upload once — which is correct,",
            "because colorImageMap legitimately points several colours at the same image.",
            "",
            "contentType comes from magic bytes, never the extension: 20 files in these trees",
            "carry an extension their bytes contradict.",
            "",
            "provider is \"local\" until every entry has a Cloudinary URL. The transform refuses a",
            "local manifest unless it is told explicitly to accept one.",
        ],
        version: 1,
        generatedAt: new Date().toISOString(),
        provider: uploaded === Object.keys(entries).length && uploaded > 0 ? "cloudinary" : "local",
        entries,
    })

    const bytes = Object.values(entries).reduce((total, e) => total + e.bytes, 0)
    console.log(`[media] scanned ${Object.keys(entries).length} distinct catalog paths -> ${idOwner.size} distinct public_ids`)
    console.log(`[media]   ${carried} already uploaded and unchanged; ${Object.keys(entries).length - carried} pending`)
    console.log(`[media]   ${(bytes / 1024 / 1024).toFixed(1)} MB`)
    console.log(`[media] manifest written to ${relative(REPO_ROOT, MANIFEST)}`)
}

function credentials() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
        console.error("[media] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must all be set.")
        console.error("[media] They belong in packages/database/.env.local and are never bundled into an app.")
        process.exit(2)
    }
    return { cloudName, apiKey, apiSecret }
}

/** Cloudinary signs the sorted, non-file parameters plus the API secret. */
function sign(params: Record<string, string>, apiSecret: string): string {
    const canonical = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&")
    return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex")
}

async function upload(): Promise<void> {
    const { cloudName, apiKey, apiSecret } = credentials()
    const manifest = readManifest()
    if (!manifest) {
        console.error("[media] no manifest. Run `pnpm media:scan` first.")
        process.exit(1)
    }

    const pending = Object.entries(manifest.entries).filter(([, entry]) => !entry.url)
    console.log(`[media] ${pending.length} of ${Object.keys(manifest.entries).length} entries pending upload`)

    // Distinct files, so a photograph shared by several catalog paths uploads once.
    const byPublicId = new Map<string, Entry[]>()
    for (const [, entry] of pending) byPublicId.set(entry.publicId, [...(byPublicId.get(entry.publicId) ?? []), entry])

    let done = 0
    const failures: Array<{ publicId: string; error: string }> = []

    for (const [publicId, group] of byPublicId) {
        const entry = group[0]!
        try {
            const timestamp = String(Math.floor(Date.now() / 1000))
            const params = { public_id: publicId, timestamp, overwrite: "true", invalidate: "true" }
            const form = new FormData()
            form.append("file", new Blob([new Uint8Array(readFileSync(join(REPO_ROOT, entry.file)))]))
            for (const [key, value] of Object.entries(params)) form.append(key, value)
            form.append("api_key", apiKey)
            form.append("signature", sign(params, apiSecret))

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: form,
            })
            if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
            const result = (await response.json()) as { secure_url: string; width: number; height: number }

            // A tiny transformed copy, inlined as the blur placeholder. Nullable in the
            // schema, so a failure here degrades rather than fails the migration.
            let blurDataUrl: string | null = null
            try {
                const tiny = await fetch(
                    `https://res.cloudinary.com/${cloudName}/image/upload/w_16,q_auto:low,f_jpg/${publicId}`
                )
                if (tiny.ok) {
                    blurDataUrl = `data:image/jpeg;base64,${Buffer.from(await tiny.arrayBuffer()).toString("base64")}`
                }
            } catch {
                blurDataUrl = null
            }

            for (const member of group) {
                member.url = result.secure_url
                member.blurDataUrl = blurDataUrl
                member.uploadedAt = new Date().toISOString()
                // Cloudinary decoded the file; trust its dimensions over the header parse.
                member.width = result.width ?? member.width
                member.height = result.height ?? member.height
            }
            done++
            if (done % 25 === 0) {
                writeManifest(manifest) // checkpoint, so an interrupted run resumes
                console.log(`[media]   ${done}/${byPublicId.size}`)
            }
        } catch (error) {
            failures.push({ publicId, error: error instanceof Error ? error.message : String(error) })
        }
    }

    manifest.generatedAt = new Date().toISOString()
    manifest.provider = Object.values(manifest.entries).every((e) => e.url) ? "cloudinary" : "local"
    writeManifest(manifest)

    console.log(`[media] uploaded ${done} file(s); ${failures.length} failure(s)`)
    for (const failure of failures) console.error(`[media]   FAILED ${failure.publicId}: ${failure.error}`)
    if (failures.length) process.exit(1)
}

async function verify(): Promise<void> {
    const manifest = readManifest()
    if (!manifest) {
        console.error("[media] no manifest. Run `pnpm media:scan` first.")
        process.exit(1)
    }

    const prisma = new PrismaClient()

    // Which catalog this database HAS decides which question is answerable.
    //
    // Before `0011`, the catalog paths live in v1's `products.images`, and the check is
    // "every referenced path has a manifest entry". After `0011` those columns are gone —
    // `collectReferences` raises `column "images" does not exist` — and the equivalent check
    // is against `product_images.publicId`, which is the same identity carried forward.
    let missing: string[] = []
    let referenceCount = 0
    try {
        const references = await collectReferences(prisma)
        referenceCount = references.length
        missing = [...new Set(references.map((r) => r.path))].filter((path) => !manifest.entries[path])
        console.log(`[media] v1 catalog: ${referenceCount} references; ${missing.length} with no manifest entry`)
    } catch {
        const byPublicId = new Set(Object.values(manifest.entries).map((entry) => entry.publicId))
        const rows = await prisma.productImage.findMany({ select: { publicId: true, url: true } })
        referenceCount = rows.length
        missing = rows.filter((row) => !row.publicId || !byPublicId.has(row.publicId)).map((row) => row.url)
        const local = rows.filter((row) => row.url.startsWith("/")).length
        console.log(`[media] v2 catalog: ${referenceCount} images; ${missing.length} with no manifest entry`)
        if (local > 0) {
            // Uploaded but not wired up is a catalog that still breaks when the local files go.
            console.error(`[media]   ${local} image(s) still hold a local path — run \`pnpm media:sync\``)
            missing.push(...rows.filter((row) => row.url.startsWith("/")).map((row) => row.url))
        }
    }
    await prisma.$disconnect()

    for (const path of missing.slice(0, 20)) console.error(`[media]   MISSING ${path}`)

    if (manifest.provider === "local") {
        console.log(`[media] manifest provider is "local" — nothing to fetch. Run \`media:upload\` first.`)
        process.exit(missing.length ? 1 : 0)
    }

    let bad = 0
    for (const [path, entry] of Object.entries(manifest.entries)) {
        const response = await fetch(entry.url!, { method: "HEAD" })
        if (!response.ok) {
            bad++
            console.error(`[media]   ${response.status} ${entry.url}  (${path})`)
        }
    }
    console.log(`[media] ${Object.keys(manifest.entries).length - bad} of ${Object.keys(manifest.entries).length} URLs return 200`)
    process.exit(missing.length || bad ? 1 : 0)
}

async function main(): Promise<void> {
    const phase = process.argv[2]
    if (phase === "scan") return scan()
    if (phase === "upload") return upload()
    if (phase === "verify") return verify()
    console.error("usage: media-migrate.ts <scan|upload|verify>")
    process.exit(2)
}

main()
