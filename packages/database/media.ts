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
    colorKey?: string
    index?: number
}

export interface Resolution extends Reference {
    source: TreeName | null
    via: "exact" | "override" | null
    file: string | null
    override?: Override
}

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

export function readDimensions(buffer: Buffer): Dimensions | null {
    switch (sniff(buffer)) {
        case "png":
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
