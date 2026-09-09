"use client"

import { useCallback, useEffect, useRef, useState } from "react"

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
    if (target.isContentEditable) return true
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

    useEffect(() => {
        if (cursor === null || !containerRef.current) return
        const row = containerRef.current.querySelectorAll("tbody tr")[cursor]
        row?.scrollIntoView({ block: "nearest" })
    }, [cursor])

    const clamped = cursor !== null && cursor >= rowCount ? null : cursor

    return {
        cursor: clamped,
        containerProps: { ref: containerRef },
    }
}
