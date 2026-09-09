import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const APP = join(__dirname, "..", "app", "[locale]", "(main)")

function staticPathsFromSitemap(): string[] {
    const source = readFileSync(join(__dirname, "..", "app", "sitemap.ts"), "utf8")
    const match = source.match(/const staticPaths = \[([^\]]*)\]/)
    if (!match) throw new Error("could not find `staticPaths` in app/sitemap.ts")
    return [...match[1]!.matchAll(/"([^"]*)"/g)].map((m) => m[1]!)
}

function pageExistsFor(path: string): boolean {
    if (path === "") return existsSync(join(APP, "page.tsx"))
    const segment = path.replace(/^\//, "")
    const candidates = [
        join(APP, "(pages)", segment, "page.tsx"),
        join(APP, segment, "page.tsx"),
    ]
    return candidates.some(existsSync)
}

describe("the sitemap only promises pages that exist", () => {
    it("every static path has a page", () => {
        const missing = staticPathsFromSitemap().filter((path) => !pageExistsFor(path))
        expect(missing).toEqual([])
    })

    it("lists more than just the home page, so an empty list cannot pass", () => {
        expect(staticPathsFromSitemap().length).toBeGreaterThan(3)
    })

    it("does not advertise the placeholder routes", () => {
        const paths = staticPathsFromSitemap()
        expect(paths).not.toContain("/catalog")
        expect(paths).not.toContain("/faqs")
    })
})
