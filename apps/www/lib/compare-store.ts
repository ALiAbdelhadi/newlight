"use client"

import { COMPARE_KEY, COMPARE_MAX } from "./compare-limits"

export { COMPARE_KEY, COMPARE_MAX }

/**
 * Which products are in the comparison, remembered per browser.
 *
 * SKUs and nothing else — the same discipline as recently-viewed. Every fact a comparison
 * shows (price, availability, specs) is fetched fresh when `/compare` renders, so a table
 * cannot quote a price that ended last week or a spec an operator has since corrected.
 *
 * The key and the cap come from `compare-limits.ts`, which carries no directive: the server
 * action validates against the same cap, and a `"use client"` module cannot be imported into a
 * `"use server"` one without putting a client reference where the number should be.
 */
const EVENT = "newlight:compare"

export function readCompare(): string[] {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(COMPARE_KEY) ?? "[]")
        return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : []
    } catch {
        return []
    }
}

export function writeCompare(skus: string[]) {
    try {
        window.localStorage.setItem(COMPARE_KEY, JSON.stringify(skus.slice(0, COMPARE_MAX)))
        window.dispatchEvent(new Event(EVENT))
    } catch {
        // Private mode or storage disabled: the feature degrades to "nothing", not to a crash.
    }
}

/** Returns whether the sku is now in the list. `false` when the cap turned it away. */
export function toggleCompare(sku: string): boolean {
    const current = readCompare()
    if (current.includes(sku)) {
        writeCompare(current.filter((entry) => entry !== sku))
        return false
    }
    if (current.length >= COMPARE_MAX) return false
    writeCompare([...current, sku])
    return true
}

/* `useSyncExternalStore` needs a stable snapshot, so the raw string is the snapshot. */
export function subscribeCompare(callback: () => void) {
    window.addEventListener("storage", callback)
    window.addEventListener(EVENT, callback)
    return () => {
        window.removeEventListener("storage", callback)
        window.removeEventListener(EVENT, callback)
    }
}

export function compareSnapshot(): string {
    try {
        return window.localStorage.getItem(COMPARE_KEY) ?? "[]"
    } catch {
        return "[]"
    }
}

export const compareServerSnapshot = () => "[]"
