import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The sitemap listed `/about-us`, and the route is `/about`. It had been submitting a 404 to
 * every crawler that read it, and nothing was checking — a sitemap is a promise about what
 * resolves, and this is the cheapest way to hold it to that promise.
 *
 * A filesystem check rather than 439 HTTP requests: the failure mode is a path that no longer
 * has a page, and that is visible without a running server.
 */
const APP = join(__dirname, "..", "app", "[locale]", "(main)")

function staticPathsFromSitemap(): string[] {
    const source = readFileSync(join(__dirname, "..", "app", "sitemap.ts"), "utf8")
    const match = source.match(/const staticPaths = \[([^\]]*)\]/)
    if (!match) throw new Error("could not find `staticPaths` in app/sitemap.ts")
    return [...match[1]!.matchAll(/"([^"]*)"/g)].map((m) => m[1]!)
}

/** "" is the locale root; anything else is a directory under the (pages) route group. */
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
        // `/catalog` and `/faqs` render one word each. Listing an empty page is worse than
        // not listing it, and this fails if someone adds them back before they have content.
        const paths = staticPathsFromSitemap()
        expect(paths).not.toContain("/catalog")
        expect(paths).not.toContain("/faqs")
    })
})
