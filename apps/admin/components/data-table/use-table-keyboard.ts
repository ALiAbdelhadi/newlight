"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Table keyboard navigation (P4.5 §11).
 *
 * j / k move · Enter opens · x selects · / focuses search · Esc clears.
 *
 * The hard part is not the bindings, it is knowing when NOT to fire them. A single-letter
 * shortcut that steals the "x" from someone typing a SKU into a filter box makes the filter
 * box unusable, and that is a worse failure than having no shortcuts at all. So every
 * keystroke is gated on three things:
 *
 *   1. The focus is not in a text field, a textarea, a select, or a contenteditable.
 *   2. No modifier is held, so ⌘K, ⌘R and Ctrl+F still belong to the browser and the palette.
 *   3. No dialog is open — Radix moves focus into the dialog, and a `j` typed there is text.
 *
 * The cursor is deliberately NOT the same thing as selection. `j`/`k` move a focus ring;
 * `x` toggles a checkbox. Conflating them means arrowing down a list silently selects forty
 * rows, and the next bulk action applies to all of them.
 */

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
    if (target.isContentEditable) return true
    // Radix menus and comboboxes take keystrokes for type-ahead.
    return target.closest('[role="dialog"],[role="menu"],[role="listbox"],[role="combobox"]') !== null
}

interface UseTableKeyboardOptions {
    rowCount: number
    onOpen: (index: number) => void
    onToggleSelect: (index: number) => void
    enabled?: boolean
}

export function useTableKeyboard({
    rowCount,
    onOpen,
    onToggleSelect,
    enabled = true,
}: UseTableKeyboardOptions) {
    const [cursor, setCursor] = useState<number | null>(null)
    const containerRef = useRef<HTMLTableElement>(null)

    /*
     * The listener reads through a ref so it can be registered once instead of being torn
     * down and rebuilt on every cursor move. The ref is written in an effect, never during
     * render: a render-phase ref write is not safe under concurrent rendering, because React
     * may render a tree it then throws away — and the discarded render would already have
     * mutated the handler's view of the world.
     */
    const latest = useRef({ rowCount, onOpen, onToggleSelect, cursor })
    useEffect(() => {
        latest.current = { rowCount, onOpen, onToggleSelect, cursor }
    })

    const move = useCallback((delta: number) => {
        setCursor((current) => {
            const total = latest.current.rowCount
            if (total === 0) return null
            const next = current === null ? (delta > 0 ? 0 : total - 1) : current + delta
            return Math.max(0, Math.min(total - 1, next))
        })
    }, [])

    useEffect(() => {
        if (!enabled) return

        function onKeyDown(event: KeyboardEvent) {
            if (event.metaKey || event.ctrlKey || event.altKey) return
            if (isTypingTarget(event.target)) return
            if (document.querySelector('[role="dialog"][data-state="open"]')) return

            switch (event.key) {
                case "j":
                    event.preventDefault()
                    move(1)
                    break
                case "k":
                    event.preventDefault()
                    move(-1)
                    break
                case "Enter": {
                    const { cursor: at } = latest.current
                    if (at === null) return
                    event.preventDefault()
                    latest.current.onOpen(at)
                    break
                }
                case "x": {
                    const { cursor: at } = latest.current
                    if (at === null) return
                    event.preventDefault()
                    latest.current.onToggleSelect(at)
                    break
                }
                case "/": {
                    // The browser's own quick-find is worth displacing: in a server-paginated
                    // table it searches fifty rows, while this searches the catalogue.
                    const search = document.querySelector<HTMLInputElement>("[data-table-search]")
                    if (!search) return
                    event.preventDefault()
                    search.focus()
                    search.select()
                    break
                }
                case "Escape":
                    setCursor(null)
                    break
                default:
                    break
            }
        }

        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [enabled, move])

    // Keep the cursor on screen when it moves past the fold.
    useEffect(() => {
        if (cursor === null || !containerRef.current) return
        const row = containerRef.current.querySelectorAll("tbody tr")[cursor]
        row?.scrollIntoView({ block: "nearest" })
    }, [cursor])

    // A shrinking page (a filter narrowed the results) must not leave the cursor past the end.
    const clamped = cursor !== null && cursor >= rowCount ? null : cursor

    return {
        cursor: clamped,
        containerProps: { ref: containerRef },
    }
}
