"use client"

import { cn } from "@/lib/utils"
import { LOW_STOCK_THRESHOLD, type StockStatus } from "@/lib/stock"
import { numericLocale, resolveLocale } from "@repo/database"
import { useLocale, useTranslations } from "next-intl"

export function formatCount(value: number, locale: string): string {
    return new Intl.NumberFormat(numericLocale(resolveLocale(locale))).format(value)
}

const DOT: Record<StockStatus, string> = {
    in: "bg-success",
    low: "bg-warning",
    out: "bg-danger",
}

const TEXT: Record<StockStatus, string> = {
    in: "text-success",
    low: "text-warning",
    out: "text-danger",
}

const CHIP: Record<StockStatus, string> = {
    in: "border-success-border bg-success-bg text-success",
    low: "border-warning-border bg-warning-bg text-warning",
    out: "border-danger-border bg-danger-bg text-danger",
}

interface StockIndicatorProps {
    status: StockStatus
    available: number
    className?: string
}

export function StockIndicator({ status, available, className }: StockIndicatorProps) {
    const t = useTranslations("stock")
    const locale = useLocale()

    const label =
        status === "out"
            ? t("out")
            : status === "low"
              ? t("lowCount", { count: available, value: formatCount(available, locale) })
              : t("in")

    return (
        <div className={cn("space-y-1.5", className)} role="status" aria-live="polite">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", TEXT[status])}>
                <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status])} />
                {label}
            </span>
            {status === "low" && (
                <>
                    <div aria-hidden className="h-0.5 w-28 overflow-hidden rounded-full bg-warning-border/60">
                        <div
                            className="h-full rounded-full bg-warning transition-[width] duration-(--duration-base) ease-out-fast"
                            style={{ width: `${Math.min(100, Math.max(8, (available / LOW_STOCK_THRESHOLD) * 100))}%` }}
                        />
                    </div>
                    <p className="text-2xs font-light tracking-wide text-muted-foreground">{t("lowHint")}</p>
                </>
            )}
        </div>
    )
}

export function StockChip({ status, className }: { status: StockStatus; className?: string }) {
    const t = useTranslations("stock")
    if (status === "in") return null

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1",
                "text-2xs font-medium uppercase tracking-label backdrop-blur-xs",
                CHIP[status],
                className
            )}
        >
            <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status])} />
            {status === "out" ? t("out") : t("lowShort")}
        </span>
    )
}
