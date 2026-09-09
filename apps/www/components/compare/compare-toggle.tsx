"use client"

import { useSyncExternalStore } from "react"
import { Check, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
    COMPARE_MAX,
    compareServerSnapshot,
    compareSnapshot,
    subscribeCompare,
    toggleCompare,
} from "@/lib/compare-store"
import { cn } from "@/lib/utils"

/**
 * The compare checkbox on a listing tile.
 *
 * A `button`, not an `input`: the whole card is a link, and a checkbox inside an anchor is
 * markup no browser agrees on. `preventDefault` plus `stopPropagation` is what stops picking a
 * product for comparison from navigating to it.
 */
export function CompareToggle({ sku }: { sku: string }) {
    const t = useTranslations("compare")
    const serialised = useSyncExternalStore(subscribeCompare, compareSnapshot, compareServerSnapshot)
    const selected = (JSON.parse(serialised) as string[]).includes(sku)

    return (
        <button
            type="button"
            aria-pressed={selected}
            aria-label={selected ? t("remove") : t("add")}
            title={selected ? t("remove") : t("add")}
            onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const added = toggleCompare(sku)
                // The cap is the only way this fails, and silence would read as a broken button.
                if (!added && !selected) toast.error(t("full", { max: COMPARE_MAX }))
            }}
            className={cn(
                "grid size-8 place-items-center rounded-full border backdrop-blur-sm",
                "transition-colors duration-(--duration-fast)",
                selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/80 text-muted-foreground hover:border-primary hover:text-foreground"
            )}
        >
            {selected ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
        </button>
    )
}
