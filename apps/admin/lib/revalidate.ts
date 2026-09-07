/**
 * Cross-app cache invalidation — BUILD §23, §13.2 item 5.
 *
 * The admin and the storefront are separate deployments, so an admin editing a product has no
 * way to clear the storefront's cache. Without this, a price change waits out
 * `revalidate = 3600` and the person who made it assumes it did not save.
 *
 * It NEVER throws into a mutation. A cache that is briefly stale is a smaller problem than an
 * edit that appears to have failed because the notification after it did — so a failure is
 * logged and returned, not raised.
 */
export type RevalidationTarget =
    | { kind: "product"; slug: string; categorySlug?: string; subCategorySlug?: string }
    | { kind: "category" }
    | { kind: "subCategory" }
    | { kind: "all" }

export async function revalidateStorefront(target: RevalidationTarget): Promise<{ ok: boolean; error?: string }> {
    const url = process.env.STOREFRONT_REVALIDATION_URL
    const secret = process.env.STOREFRONT_REVALIDATION_SECRET

    if (!url || !secret) {
        console.warn("[revalidate] STOREFRONT_REVALIDATION_URL or _SECRET is not set; the storefront will serve stale pages until its own timer expires.")
        return { ok: false, error: "not configured" }
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: JSON.stringify(target),
        })
        if (!response.ok) {
            const body = await response.text()
            console.error(`[revalidate] ${response.status}: ${body}`)
            return { ok: false, error: `${response.status}` }
        }
        return { ok: true }
    } catch (error) {
        console.error(`[revalidate] ${error instanceof Error ? error.message : String(error)}`)
        return { ok: false, error: "unreachable" }
    }
}
