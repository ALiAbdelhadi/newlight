"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Box, ShoppingCart, User } from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@/components/ui/command"
import { NAVIGATION, OVERVIEW } from "@/lib/navigation"
import { searchAdmin, type SearchResults } from "@/app/action/search"

/**
 * ⌘K / Ctrl+K (P4.5 §10).
 *
 * The Navigate group is built from `lib/navigation.ts`, the same array the sidebar renders, so
 * a surface cannot exist in one and be missing from the other — which is the failure mode of
 * every hand-maintained palette.
 *
 * RECORDS ARE SEARCHED ON THE SERVER, not filtered on the client. cmdk's own matching is over
 * the items already in the list, and the panel's records are in Postgres. Postgres has already
 * decided which rows match, so each record item's cmdk value carries the typed term verbatim —
 * it therefore always scores, and cmdk cannot hide a row the database found. That matters most
 * for the matches whose evidence is not on screen: an Arabic product name behind an English
 * label, or an order found by the recipient's phone number.
 *
 * The Navigate groups keep cmdk's filtering, because those items ARE the whole set.
 *
 * The search fires after 200ms of quiet and only from two characters. `useTransition` keeps the
 * previous results on screen while the next ones load rather than blanking the list, which is
 * the difference between a palette that feels instant and one that flickers on every keystroke.
 */

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const EMPTY: SearchResults = { products: [], orders: [], customers: [] }

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResults>(EMPTY)
    const [searching, startSearch] = useTransition()

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return
            /*
             * Claim the shortcut before the browser does — Ctrl+K focuses the address bar in
             * Chrome, and an operator who hits it expecting the palette should not land in the
             * URL bar. Meta+K is unclaimed on macOS, but the handling is the same.
             */
            event.preventDefault()
            onOpenChange(!open)
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, onOpenChange])

    useEffect(() => {
        const term = query.trim()
        // Below the floor there is nothing to ask for. The stale results are hidden at render
        // by `searchable` rather than cleared here — clearing state inside an effect is the
        // cascading render the compiler lint rule rejects, and this way the list does not blink
        // empty between two keystrokes either.
        if (term.length < 2) return
        const timer = setTimeout(() => {
            startSearch(async () => {
                setResults(await searchAdmin(term))
            })
        }, 200)
        return () => clearTimeout(timer)
    }, [query])

    function go(href: string) {
        onOpenChange(false)
        setQuery("")
        setResults(EMPTY)
        router.push(href)
    }

    const searchable = query.trim().length >= 2
    const hits = searchable
        ? results.products.length + results.orders.length + results.customers.length
        : 0

    return (
        <CommandDialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next)
                if (!next) {
                    setQuery("")
                    setResults(EMPTY)
                }
            }}
        >
            <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Go to a surface, or search products, orders and customers…"
            />
            <CommandList>
                <CommandEmpty>
                    {searching
                        ? "Searching…"
                        : searchable
                          ? "Nothing matches that."
                          : "Type at least two characters to search records."}
                </CommandEmpty>

                {hits > 0 && (
                    <>
                        <RecordGroup
                            heading="Products"
                            icon={Box}
                            hits={results.products}
                            term={query}
                            onSelect={go}
                        />
                        <RecordGroup
                            heading="Orders"
                            icon={ShoppingCart}
                            hits={results.orders}
                            term={query}
                            onSelect={go}
                        />
                        <RecordGroup
                            heading="Customers"
                            icon={User}
                            hits={results.customers}
                            term={query}
                            onSelect={go}
                        />
                    </>
                )}

                <CommandGroup heading="Overview">
                    <CommandItem value={OVERVIEW.label} onSelect={() => go(OVERVIEW.href)} className="text-xs">
                        <OVERVIEW.icon aria-hidden className="size-3.5" />
                        {OVERVIEW.label}
                    </CommandItem>
                </CommandGroup>

                {NAVIGATION.map((domain) => (
                    <CommandGroup key={domain.id} heading={domain.label}>
                        {domain.surfaces.map((surface) => (
                            <CommandItem
                                key={surface.href}
                                /*
                                 * The domain is part of the search value so typing "inventory"
                                 * finds "Stock levels" — an operator looks for the area before
                                 * they remember the screen's name.
                                 */
                                value={`${domain.label} ${surface.label}`}
                                onSelect={() => go(surface.href)}
                                className="text-xs"
                            >
                                <surface.icon aria-hidden className="size-3.5" />
                                {surface.label}
                                <CommandShortcut>{surface.href.replace("/admin", "")}</CommandShortcut>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                ))}
            </CommandList>
        </CommandDialog>
    )
}

function RecordGroup({
    heading,
    icon: Icon,
    hits,
    term,
    onSelect,
}: {
    heading: string
    icon: React.ElementType
    hits: { id: string; label: string; detail: string; href: string; keywords: string }[]
    /** The typed query, folded into each value so cmdk cannot filter out a server match. */
    term: string
    onSelect: (href: string) => void
}) {
    if (hits.length === 0) return null

    return (
        <CommandGroup heading={heading}>
            {hits.map((hit) => (
                <CommandItem
                    key={hit.id}
                    // The term is part of the value: the database already decided this row
                    // matches, and cmdk must not second-guess it with its own fuzzy score.
                    value={`${term} ${hit.label} ${hit.detail} ${hit.keywords}`}
                    onSelect={() => onSelect(hit.href)}
                    className="text-xs"
                >
                    <Icon aria-hidden className="size-3.5" />
                    <span className="min-w-0 truncate">
                        <bdi dir="auto">{hit.label}</bdi>
                    </span>
                    <CommandShortcut className="truncate font-mono">{hit.detail}</CommandShortcut>
                </CommandItem>
            ))}
        </CommandGroup>
    )
}
