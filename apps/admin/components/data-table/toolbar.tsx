"use client"

import { Search, Settings2, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buildTableQuery } from "@/lib/table-params"
import { cn } from "@/lib/utils"

/**
 * The list toolbar: search, filters, column visibility.
 *
 * 40px tall and on one line. The pattern this replaces — a row of tabs above the table —
 * looks tidier and is a trap: tabs can only express one filter at a time, so "out of stock"
 * and "magnetic" cannot both be on, and the moment a second dimension is needed somebody
 * adds a second tab strip.
 */

export interface FilterOption {
    value: string
    label: string
}

export interface FilterDef {
    /** The query-string key. Becomes part of the shareable URL. */
    key: string
    label: string
    options: FilterOption[]
    width?: string
}

interface ToolbarProps {
    searchKey?: string
    searchPlaceholder?: string
    filters?: FilterDef[]
    /** Column id → label, for the visibility menu. */
    columns?: { id: string; label: string; visible: boolean; toggle: () => void }[]
    actions?: React.ReactNode
}

export function DataTableToolbar({
    searchKey = "q",
    searchPlaceholder = "Search…",
    filters = [],
    columns = [],
    actions,
}: ToolbarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const push = useCallback(
        (patch: Record<string, string | number | null>) => {
            router.push(`${pathname}${buildTableQuery(new URLSearchParams(searchParams.toString()), patch)}`, {
                scroll: false,
            })
        },
        [router, pathname, searchParams]
    )

    const urlQuery = searchParams.get(searchKey) ?? ""
    const [query, setQuery] = useState(urlQuery)

    /*
     * Debounced, and the input is uncontrolled with respect to the URL between keystrokes.
     * Navigating on every character would re-run the server query per letter and fight the
     * caret. 300ms is long enough to finish a SKU and short enough not to feel stuck.
     */
    useEffect(() => {
        if (query === urlQuery) return
        const timer = setTimeout(() => push({ [searchKey]: query || null }), 300)
        return () => clearTimeout(timer)
    }, [query, urlQuery, searchKey, push])

    /*
     * The URL can change without the input — back/forward, or "Clear filters". Adjusting
     * during render rather than in an effect is React's own documented pattern for
     * "state derived from a prop that changed": an effect here would render the stale
     * value once, then re-render, which is the cascading render the compiler rejects.
     */
    const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery)
    if (urlQuery !== lastUrlQuery) {
        setLastUrlQuery(urlQuery)
        setQuery(urlQuery)
    }

    const activeFilters = filters.filter((filter) => searchParams.get(filter.key))
    const hasAnyFilter = activeFilters.length > 0 || urlQuery.length > 0

    return (
        // min-h, not h: at a narrow width the controls wrap to a second line, and a fixed
        // height made them overflow the box and render on top of the first table row.
        <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 px-3 py-1.5">
            <div className="relative">
                <Search
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    // The `/` shortcut finds the input by this attribute.
                    data-table-search
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    className="h-[30px] w-56 pl-7 text-sm"
                />
            </div>

            {filters.map((filter) => {
                const value = searchParams.get(filter.key) ?? ""
                return (
                    <Select
                        key={filter.key}
                        value={value || "__all"}
                        onValueChange={(next) => push({ [filter.key]: next === "__all" ? null : next })}
                    >
                        <SelectTrigger
                            size="sm"
                            className={cn("h-[30px] text-xs", filter.width ?? "w-40", value && "border-ring")}
                        >
                            <SelectValue placeholder={filter.label} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all" className="text-xs">
                                {filter.label}: all
                            </SelectItem>
                            {filter.options.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-xs">
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            })}

            {hasAnyFilter && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        const cleared: Record<string, null> = { [searchKey]: null }
                        for (const filter of filters) cleared[filter.key] = null
                        push(cleared)
                    }}
                    className="h-[30px] px-2 text-xs text-muted-foreground"
                >
                    <X aria-hidden className="mr-1 size-3" />
                    Clear
                </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
                {columns.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-[30px] text-xs">
                                <Settings2 aria-hidden className="mr-1.5 size-3.5" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Visible columns
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {columns.map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={column.visible}
                                    onCheckedChange={column.toggle}
                                    onSelect={(event) => event.preventDefault()}
                                    className="text-xs"
                                >
                                    {column.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {actions}
            </div>
        </div>
    )
}
