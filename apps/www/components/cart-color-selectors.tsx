"use client"

import { ChevronDown } from "lucide-react"
import { useLocale } from "next-intl"

import { Swatch } from "@/components/swatch"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const formatColorTemp = (temp: string, locale: string): string => {
    const isArabic = locale.startsWith("ar")
    const map: Record<string, string> = {
        WARM_3000K: isArabic ? "دافئ 3000K" : "Warm 3000K",
        COOL_4000K: isArabic ? "بارد 4000K" : "Cool 4000K",
        WHITE_6500K: isArabic ? "أبيض 6500K" : "White 6500K",
    }
    return map[temp] || temp.replace(/_/g, " ")
}

const formatAvailableColor = (color: string, locale: string): string => {
    const isArabic = locale.startsWith("ar")
    const map: Record<string, string> = {
        BLACK: isArabic ? "أسود" : "Black",
        GRAY: isArabic ? "رمادي" : "Gray",
        WHITE: isArabic ? "أبيض" : "White",
        GOLD: isArabic ? "ذهبي" : "Gold",
        WOOD: isArabic ? "خشبي" : "Wood",
    }
    return map[color] || color.replace(/_/g, " ")
}

/**
 * The two per-line pickers in the cart drawer.
 *
 * They were two components with one body between them: the same dropdown, the same trigger, the
 * same list, and each carrying its own copy of a swatch palette that also existed on the product
 * page. The palette is `components/swatch.tsx` now and the dropdown is `SwatchSelect` below, so
 * what is left of each export is its vocabulary — which keys it offers and how they are named.
 *
 * A trigger holding one option is a control that cannot be operated; both callers already pass
 * `disabled` for that case and it stays, but the chevron goes with it, so a single-option line
 * reads as a statement of fact rather than a broken menu.
 */
function SwatchSelect({
    kind,
    options,
    value,
    label,
    onChange,
    disabled,
    width,
}: {
    kind: "surface" | "temperature"
    options: string[]
    value: string
    label: (key: string) => string
    onChange: (key: string) => void
    disabled: boolean
    width: string
}) {
    const only = options.length === 1

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || only}
                    className="h-7 w-full justify-between gap-1.5 px-2 text-xs"
                >
                    <span className="flex items-center gap-1.5">
                        <Swatch value={value} kind={kind} size="sm" />
                        <span className="truncate">{label(value)}</span>
                    </span>
                    {!only && <ChevronDown aria-hidden className="size-3 text-muted-foreground" />}
                </Button>
            </DropdownMenuTrigger>

            {!only && (
                <DropdownMenuContent align="start" className={width}>
                    {options.map((option) => (
                        <DropdownMenuItem
                            key={option}
                            onClick={() => onChange(option)}
                            className="cursor-pointer gap-2"
                        >
                            <Swatch value={option} kind={kind} selected={option === value} />
                            <span className="text-sm">{label(option)}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    )
}

export function CartColorTempSelector({
    availableTemps,
    selectedTemp,
    onChange,
    disabled = false,
}: {
    availableTemps: string[]
    selectedTemp: string | null
    onChange: (temp: string) => void
    disabled?: boolean
}) {
    const locale = useLocale()
    if (!availableTemps || availableTemps.length === 0) return null

    return (
        <SwatchSelect
            kind="temperature"
            options={availableTemps}
            value={selectedTemp || availableTemps[0]!}
            label={(temp) => formatColorTemp(temp, locale)}
            onChange={onChange}
            disabled={disabled}
            width="w-[200px]"
        />
    )
}

export function CartSurfaceColorSelector({
    availableColors,
    selectedColorKey,
    onChange,
    disabled = false,
}: {
    availableColors: string[]
    selectedColorKey: string | null
    onChange: (color: string) => void
    disabled?: boolean
}) {
    const locale = useLocale()
    if (!availableColors || availableColors.length === 0) return null

    return (
        <SwatchSelect
            kind="surface"
            options={availableColors}
            value={selectedColorKey || availableColors[0]!}
            label={(color) => formatAvailableColor(color, locale)}
            onChange={onChange}
            disabled={disabled}
            width="w-[180px]"
        />
    )
}
