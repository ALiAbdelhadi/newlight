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
            event.preventDefault()
            onOpenChange(!open)
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, onOpenChange])

    useEffect(() => {
        const term = query.trim()
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
    term: string
    onSelect: (href: string) => void
}) {
    if (hits.length === 0) return null

    return (
        <CommandGroup heading={heading}>
            {hits.map((hit) => (
                <CommandItem
                    key={hit.id}
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
