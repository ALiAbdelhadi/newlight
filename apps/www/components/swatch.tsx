import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type SwatchSpec = {
    fill: string
    ink: string
}

const UNKNOWN: SwatchSpec = {
    fill: "from-swatch-unknown to-swatch-unknown-shade",
    ink: "text-swatch-ink-dark",
}

const SURFACE: Record<string, SwatchSpec> = {
    BLACK: { fill: "from-swatch-black to-swatch-black-shade", ink: "text-swatch-ink-light" },
    GRAY: { fill: "from-swatch-gray to-swatch-gray-shade", ink: "text-swatch-ink-light" },
    WHITE: { fill: "from-swatch-white to-swatch-white-shade", ink: "text-swatch-ink-dark" },
    GOLD: { fill: "from-swatch-gold to-swatch-gold-shade", ink: "text-swatch-ink-dark" },
    WOOD: { fill: "from-swatch-wood to-swatch-wood-shade", ink: "text-swatch-ink-light" },
}

const TEMPERATURE: Record<string, SwatchSpec> = {
    WARM_3000K: { fill: "from-swatch-warm to-swatch-warm-shade", ink: "text-swatch-ink-dark" },
    COOL_4000K: { fill: "from-swatch-cool to-swatch-cool-shade", ink: "text-swatch-ink-dark" },
    WHITE_6500K: { fill: "from-swatch-daylight to-swatch-daylight-shade", ink: "text-swatch-ink-dark" },
}

const SIZE = {
    sm: { disc: "size-3", check: "size-2" },
    md: { disc: "size-5", check: "size-3" },
    lg: { disc: "size-7", check: "size-4" },
} as const

export interface SwatchProps {
    value: string
    kind: "surface" | "temperature"
    size?: keyof typeof SIZE
    selected?: boolean
    className?: string
}

export function Swatch({ value, kind, size = "md", selected = false, className }: SwatchProps) {
    const spec = (kind === "surface" ? SURFACE : TEMPERATURE)[value] ?? UNKNOWN
    const scale = SIZE[size]

    return (
        <span
            aria-hidden
            className={cn(
                "grid shrink-0 place-items-center rounded-full border border-swatch-edge",
                "bg-linear-to-br",
                scale.disc,
                spec.fill,
                className
            )}
        >
            {selected && <Check className={cn(scale.check, spec.ink)} strokeWidth={2.5} />}
        </span>
    )
}
