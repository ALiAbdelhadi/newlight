import { cn } from "@/lib/utils"

/**
 * THE Newlight directional arrow.
 *
 * This is not a new design. It is the arrow the product card has always used, extracted
 * verbatim — the same path, the same 1.5 stroke, the same round caps, the same circular well,
 * the same fill-on-hover — and then made available to everything else, because it was the one
 * arrow in the storefront that anybody had actually designed.
 *
 * What it replaces, found across `apps/www`:
 *
 *   `ArrowRight` from lucide, at six call sites, with four different hover behaviours
 *   (`group-hover:translate-x-1`, `group-hover:translate-x-0.5`, none, and one that moved on a
 *   parent that had no `group` class so it never moved at all).
 *
 *   A hand-written `<path d="M5 12h14M12 5l7 7-7 7" />` in the collection section — a DIFFERENT
 *   arrow glyph, shorter tail, `strokeWidth={2.5}`, sitting in a square rather than a circle.
 *
 * WHY THIS GLYPH. `M17 8l4 4m0 0l-4 4m4-4H3` is a long-tailed arrow: the shaft runs nearly the
 * full 24px box before the head. Lucide's `ArrowRight` is a short shaft with a proportionally
 * large head, which at 16px reads as a chevron. The long tail is what makes the movement
 * legible when the arrow translates on hover, and it is why the card's arrow felt like Newlight
 * and the borrowed ones did not.
 *
 * RTL IS BUILT IN. `rtl:rotate-180`, on the glyph rather than the well, so the circle does not
 * spin. "Forward" in Arabic is leftward, and an arrow that does not mirror points backwards on
 * half the site.
 *
 * THE EXCEPTIONS, and they are deliberate (§13):
 *   - back navigation ("← Back to products") is a different meaning, not a different style
 *   - breadcrumb separators are punctuation
 *   - select and dropdown indicators are platform affordances
 *   - carousel prev/next are positional controls
 * Those keep lucide's chevrons. Everything that means "go on to this thing" uses this.
 */

export type ArrowVariant = "circled" | "inline"

interface DirectionalArrowProps {
    /**
     * `circled` — the product card's treatment: a 32px ring that fills with the accent when the
     * card is hovered. For a card, a tile, or any target whose whole surface is the link.
     * `inline` — the bare glyph, for a button or a text link where a ring would be a second
     * button inside the button. It translates instead of filling.
     */
    variant?: ArrowVariant
    /** Applies to the glyph in `inline`, and to the well in `circled`. */
    className?: string
    /**
     * Off when the arrow sits inside a `group` that owns the hover — a product card, a CTA
     * button. On when the arrow IS the interactive element.
     */
    standalone?: boolean
}

/**
 * The glyph itself. Never exported: every consumer goes through `DirectionalArrow`, which is
 * what stops a fifth stroke weight appearing.
 */
function Glyph({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className={cn("rtl:rotate-180", className)}
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
    )
}

export function DirectionalArrow({ variant = "inline", className, standalone = false }: DirectionalArrowProps) {
    if (variant === "circled") {
        return (
            <span
                className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border border-border",
                    "transition-colors duration-(--duration-base)",
                    standalone
                        ? "hover:border-primary hover:bg-primary hover:text-primary-foreground"
                        : "group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground",
                    className
                )}
            >
                <Glyph className="size-4" />
            </span>
        )
    }

    return (
        <Glyph
            className={cn(
                "size-4 shrink-0 transition-transform duration-(--duration-fast)",
                /*
                 * One movement, everywhere: 2px along the reading direction. `rtl:` flips the
                 * translate as well as the glyph, because in Arabic "forward" is -x. The global
                 * reduced-motion rule in globals.css zeroes the transition.
                 */
                standalone
                    ? "hover:translate-x-0.5 rtl:hover:-translate-x-0.5"
                    : "group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
                className
            )}
        />
    )
}
