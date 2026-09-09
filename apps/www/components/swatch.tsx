import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * THE material sample — a lamp's finish, or the colour of the light it throws.
 *
 * This is the same extraction the directional arrow got, for the same reason. The swatch
 * existed three times: `surface-color-button.tsx` and `cart-color-selectors.tsx` each carried a
 * verbatim copy of a five-finish map, and `color-temp-buttons.tsx` and `cart-color-selectors.tsx`
 * each carried a copy of a three-temperature one. Copies drift, and these had:
 *
 *   THE SELECTED CHECK WAS INVISIBLE ON THE TEMPERATURE SWATCHES. The product page drew it in
 *   `text-muted` — slate-100 — on a pale yellow disc, and the cart drew the same mark in
 *   `text-gray-700`. Same control, same state, two answers, and one of them could not be seen.
 *
 *   EVERY SAMPLE OWNED A BESPOKE BORDER a step darker than its own fill (`border-gray-900`,
 *   `border-yellow-400`, `border-amber-700`, …). Nine borders for one hairline.
 *
 *   THE PALETTE WAS IN THE COMPONENT. `bg-black`, `from-gray-400`, `to-yellow-600` — the exact
 *   thing `globals.css` opens by forbidding, and the one case where the rule needed a token
 *   family rather than an exception, because a finish is not a theme: a black lamp is black in
 *   dark mode.
 *
 * WHY THE VOCABULARY LIVES HERE AND NOT IN THE DATABASE. The keys are the enum the catalogue
 * already stores (`BLACK`, `WARM_3000K`); what a key LOOKS like is a rendering decision, and it
 * belongs next to the thing that renders it. An unknown key is not an error — the shop can add
 * a finish before anybody draws it — so it falls back to a neutral disc and still shows its name.
 */

type SwatchSpec = {
    /** The two gradient stops, lit from the top-left corner on every sample. */
    fill: string
    /** Which of the two ink tokens the check mark can actually be seen in. */
    ink: string
}

const UNKNOWN: SwatchSpec = {
    fill: "from-swatch-unknown to-swatch-unknown-shade",
    ink: "text-swatch-ink-dark",
}

/** Cabinet finishes. Keys are the catalogue's `availableColors` values. */
const SURFACE: Record<string, SwatchSpec> = {
    BLACK: { fill: "from-swatch-black to-swatch-black-shade", ink: "text-swatch-ink-light" },
    GRAY: { fill: "from-swatch-gray to-swatch-gray-shade", ink: "text-swatch-ink-light" },
    WHITE: { fill: "from-swatch-white to-swatch-white-shade", ink: "text-swatch-ink-dark" },
    GOLD: { fill: "from-swatch-gold to-swatch-gold-shade", ink: "text-swatch-ink-dark" },
    WOOD: { fill: "from-swatch-wood to-swatch-wood-shade", ink: "text-swatch-ink-light" },
}

/** Correlated colour temperature, warm to daylight. */
const TEMPERATURE: Record<string, SwatchSpec> = {
    WARM_3000K: { fill: "from-swatch-warm to-swatch-warm-shade", ink: "text-swatch-ink-dark" },
    COOL_4000K: { fill: "from-swatch-cool to-swatch-cool-shade", ink: "text-swatch-ink-dark" },
    WHITE_6500K: { fill: "from-swatch-daylight to-swatch-daylight-shade", ink: "text-swatch-ink-dark" },
}

/* Three sizes, because the swatch appears at three scales and nothing else: inside a cart row's
   dropdown trigger, in that dropdown's list, and as the product page's own picker. */
const SIZE = {
    sm: { disc: "size-3", check: "size-2" },
    md: { disc: "size-5", check: "size-3" },
    lg: { disc: "size-7", check: "size-4" },
} as const

export interface SwatchProps {
    /** `BLACK`, `WARM_3000K`, … — an unrecognised key draws the neutral sample. */
    value: string
    kind: "surface" | "temperature"
    size?: keyof typeof SIZE
    /** Draws the check. The label that names the sample lives outside this component. */
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
