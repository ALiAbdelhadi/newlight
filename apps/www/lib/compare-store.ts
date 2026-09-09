"use client"

import { COMPARE_KEY, COMPARE_MAX } from "./compare-limits"

export { COMPARE_KEY, COMPARE_MAX }

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
    }
}

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
