/**
 * Media resolution and inspection — the one implementation.
 *
 * Both the §15.2 audit gate and the Cloudinary migration need to answer the same question:
 * "which file on disk does this catalog path mean, and what is actually in it?" Two answers
 * to that question is the same class of defect this whole migration exists to remove, so
 * there is one resolver and both scripts call it.
 *
 * Nothing here writes anything, and nothing here edits a catalog value (§0.5).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

export type TreeName = "www" | "admin"

export interface Override {
    from: string
    to: string
    product: string
    imageIndex?: number
    class: string
    confidence: "mechanical" | "needs-review"
    why: string
}

export interface Tree {
    name: TreeName
    root: string
    files: Map<string, string>
}

export interface Reference {
    product: string
    path: string
    kind: "images" | "colorImageMap"
    /** Colour key, when the reference came from colorImageMap. */
    colorKey?: string
    /** 1-based position within Product.images; absent for colorImageMap references. */
    index?: number
}

export interface Resolution extends Reference {
    source: TreeName | null
    via: "exact" | "override" | null
    /** Absolute path of the file that backs this reference. */
    file: string | null
    override?: Override
}

/**
 * Every catalog path that names an image, from both Product.images and Product.colorImageMap.
 * Raw SQL so it reads a v1-shaped database as well as a partially migrated one.
 */
export async function collectReferences(client: {
    $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>
}): Promise<Reference[]> {
    const rows = (await client.$queryRaw`
        SELECT "productId", images, "colorImageMap" FROM products ORDER BY "productId"`) as Array<{
        productId: string
        images: string[] | null
        colorImageMap: unknown
    }>

    const references: Reference[] = []
    for (const row of rows) {
        ;(row.images ?? []).forEach((path, i) =>
            references.push({ product: row.productId, path, kind: "images", index: i + 1 })
        )
        const map = row.colorImageMap as Record<string, string[]> | null
        for (const [colorKey, paths] of Object.entries(map ?? {})) {
            for (const path of paths) references.push({ product: row.productId, path, kind: "colorImageMap", colorKey })
        }
    }
    return references
}

/** Walk up to the workspace root, so scripts work from any cwd and under any module format. */
export function findRepoRoot(): string {
    let dir = process.cwd()
    for (let i = 0; i < 10; i++) {
        if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir
        dir = join(dir, "..")
    }
    throw new Error("could not locate the workspace root (no pnpm-workspace.yaml above cwd)")
}

export const REPO_ROOT = findRepoRoot()
export const PACKAGE_ROOT = join(REPO_ROOT, "packages", "database")

/**
 * apps/admin/public is in this list because it is NOT a stale duplicate of apps/www/public,
 * as the original audit assumed. It holds files that exist nowhere else — every nl-blade
 * image among them — and full-size originals where www holds downscaled copies. www is
 * consulted first because it is the tree the storefront actually serves.
 */
export function loadTrees(): Tree[] {
    return (
        [
            { name: "www" as const, root: join(REPO_ROOT, "apps/www/public") },
            { name: "admin" as const, root: join(REPO_ROOT, "apps/admin/public") },
        ]
    ).map((tree) => ({ ...tree, files: walk(tree.root) }))
}

function walk(root: string): Map<string, string> {
    const files = new Map<string, string>()
    if (!existsSync(root)) return files
    const stack = [root]
    while (stack.length) {
        const dir = stack.pop()!
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name)
            if (entry.isDirectory()) stack.push(full)
            else files.set(`/${relative(root, full)}`, full)
        }
    }
    return files
}

export function loadOverrides(): Override[] {
    const file = join(PACKAGE_ROOT, "data", "media-overrides.json")
    if (!existsSync(file)) return []
    return JSON.parse(readFileSync(file, "utf8")).overrides ?? []
}

/**
 * Resolution order, in order of trust: exact match in www, exact match in admin, then an
 * explicit committed override. An override never beats a real file — that ordering is what
 * stopped four nl-w-l-5 images being replaced by downscaled copies.
 */
export function resolve(references: Reference[], trees: Tree[], overrides: Override[]): Resolution[] {
    const overrideBy = new Map(overrides.map((o) => [o.from, o]))
    return references.map((reference) => {
        for (const tree of trees) {
            const file = tree.files.get(reference.path)
            if (file) return { ...reference, source: tree.name, via: "exact", file }
        }
        const override = overrideBy.get(reference.path)
        if (override) {
            for (const tree of trees) {
                const file = tree.files.get(override.to)
                if (file) return { ...reference, source: tree.name, via: "override", file, override }
            }
        }
        return { ...reference, source: null, via: null, file: null }
    })
}

export type ContentType = "png" | "jpeg" | "webp" | "unknown"

/**
 * Content type from magic bytes, never from the path. 20 files in these trees carry an
 * extension their bytes contradict, so trusting the extension would mislabel one in
 * seventeen uploads.
 */
export function sniff(buffer: Buffer): ContentType {
    if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.subarray(1, 4).toString() === "PNG") return "png"
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg"
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "webp"
    return "unknown"
}

export interface Dimensions {
    width: number
    height: number
}

/**
 * Read pixel dimensions straight out of the file header.
 *
 * Deliberately dependency-free: sharp is a large native module to add for three integers,
 * and ProductImage.width/height are nullable precisely so rendering never blocks on them.
 * Returns null rather than guessing when a format cannot be read.
 */
export function readDimensions(buffer: Buffer): Dimensions | null {
    switch (sniff(buffer)) {
        case "png":
            // IHDR is always the first chunk: 8-byte signature, 4-byte length, 4-byte type.
            if (buffer.length < 24) return null
            return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }

        case "jpeg": {
            let offset = 2
            while (offset + 9 < buffer.length) {
                if (buffer[offset] !== 0xff) {
                    offset++
                    continue
                }
                const marker = buffer[offset + 1]!
                // SOF0-3, SOF5-7, SOF9-11, SOF13-15 carry the frame dimensions. The gaps
                // (C4 DHT, C8 JPG, CC DAC) are other segments that must be skipped.
                const isFrame =
                    (marker >= 0xc0 && marker <= 0xc3) ||
                    (marker >= 0xc5 && marker <= 0xc7) ||
                    (marker >= 0xc9 && marker <= 0xcb) ||
                    (marker >= 0xcd && marker <= 0xcf)
                if (isFrame) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
                if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
                    offset += 2
                    continue
                }
                offset += 2 + buffer.readUInt16BE(offset + 2)
            }
            return null
        }

        case "webp": {
            const chunk = buffer.subarray(12, 16).toString()
            if (chunk === "VP8X" && buffer.length >= 30) {
                // Canvas size is stored minus one, as two 24-bit little-endian integers.
                return {
                    width: (buffer[24]! | (buffer[25]! << 8) | (buffer[26]! << 16)) + 1,
                    height: (buffer[27]! | (buffer[28]! << 8) | (buffer[29]! << 16)) + 1,
                }
            }
            if (chunk === "VP8 " && buffer.length >= 30) {
                return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
            }
            if (chunk === "VP8L" && buffer.length >= 25) {
                const bits = buffer.readUInt32LE(21)
                return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
            }
            return null
        }

        default:
            return null
    }
}

/**
 * A deterministic Cloudinary public_id, derived from the RESOLVED file rather than the
 * catalog path. Two catalog paths that resolve to one file therefore share a public_id and
 * upload once — which is correct, because mapColorImages legitimately points several colours
 * at the same photograph.
 *
 * Deterministic means re-running the migration overwrites rather than duplicates.
 */
export function publicIdFor(tree: Tree, file: string): string {
    const relativePath = `/${relative(tree.root, file)}`
    const withoutExtension = relativePath.replace(/\.[^./]+$/, "")
    return withoutExtension
        .replace(/^\//, "")
        .toLowerCase()
        .replace(/[×✕✖]/g, "x")
        .split("/")
        .map((segment) =>
            segment
                .replace(/[()]/g, "")
                .replace(/[^a-z0-9._-]+/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/^-+|-+$/g, "")
        )
        .filter(Boolean)
        .join("/")
}
