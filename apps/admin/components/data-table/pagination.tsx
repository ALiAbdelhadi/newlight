"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DENSITIES, PAGE_SIZES, pageWindow, type TableState } from "@/lib/table-params"
import { cn } from "@/lib/utils"

export function DataTablePagination({
    state,
    total,
    onChange,
}: {
    state: TableState
    total: number
    onChange: (patch: Record<string, string | number | null>) => void
}) {
    const window = pageWindow(state, total)

    return (
        <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-xs">
            <span className="tabular-nums text-muted-foreground">
                {total === 0 ? (
                    "No rows"
                ) : (
                    <>
                        <span className="font-medium text-foreground">
                            {window.from}–{window.to}
                        </span>{" "}
                        of <span className="font-medium text-foreground">{total}</span>
                    </>
                )}
            </span>

            <div className="ml-auto flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="hidden sm:inline">Density</span>
                    <Select value={state.density} onValueChange={(value) => onChange({ density: value })}>
                        <SelectTrigger size="sm" aria-label="Row density" className="h-6 w-28 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {DENSITIES.map((density) => (
                                <SelectItem key={density} value={density} className="text-xs capitalize">
                                    {density}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>

                <label className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="hidden sm:inline">Rows</span>
                    <Select
                        value={String(state.pageSize)}
                        onValueChange={(value) => onChange({ size: value })}
                    >
                        <SelectTrigger size="sm" aria-label="Rows per page" className="h-6 w-16 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZES.map((size) => (
                                <SelectItem key={size} value={String(size)} className="text-xs">
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>

                <div className="flex items-center gap-1">
                    <PageButton
                        label="Previous page"
                        disabled={!window.hasPrevious}
                        onClick={() => onChange({ page: state.page - 1 })}
                    >
                        <ChevronLeft aria-hidden className="size-3.5" />
                    </PageButton>
                    <span className="tabular-nums text-muted-foreground">
                        {Math.min(state.page, window.totalPages)} / {window.totalPages}
                    </span>
                    <PageButton
                        label="Next page"
                        disabled={!window.hasNext}
                        onClick={() => onChange({ page: state.page + 1 })}
                    >
                        <ChevronRight aria-hidden className="size-3.5" />
                    </PageButton>
                </div>
            </div>
        </div>
    )
}

function PageButton({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string
    disabled: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "grid size-6 place-items-center rounded border border-border-strong bg-card",
                "transition-colors duration-(--duration-fast)",
                disabled ? "cursor-not-allowed opacity-40" : "hover:bg-accent"
            )}
        >
            {children}
        </button>
    )
}
