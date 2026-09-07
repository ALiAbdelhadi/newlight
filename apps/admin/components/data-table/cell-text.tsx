import { cn } from "@/lib/utils"

/**
 * A cell holding text that may be Arabic (P4.5 § RTL strategy).
 *
 * This is the whole bidirectional strategy in one component, and the choice of element
 * matters more than anything else in it.
 *
 * The obvious approach — `dir="auto"` on the cell — is wrong. It resolves the direction of
 * the CELL, so an Arabic product name flips the cell to RTL and right-aligns itself inside a
 * left-aligned column. Scroll a page of mixed catalogue and the left edge of the column
 * breaks into a ragged mess, which destroys the one thing a table column is for: being
 * scannable straight down.
 *
 * `<bdi>` carries `unicode-bidi: isolate` by default. It resolves the string's own paragraph
 * direction WITHOUT touching the container's direction, alignment, borders or box. The
 * column stays LTR and left-aligned; the Arabic inside it reads correctly.
 *
 * The corollary, which is easy to get wrong: a cell holding a SKU AND an Arabic name needs
 * TWO bdi elements, not one wrapping a concatenated string. In one run the bidi algorithm
 * reorders the whole line and the Latin SKU jumps to the wrong end.
 */
export function CellText({
    children,
    className,
    truncate = true,
    ...props
}: React.ComponentProps<"bdi"> & { truncate?: boolean }) {
    return (
        <bdi
            dir="auto"
            className={cn("block", truncate && "truncate", className)}
            {...props}
        >
            {children}
        </bdi>
    )
}

/**
 * The primary cell of a row: an identifier and a name, stacked.
 *
 * Two separate `<bdi>` elements — see above. `title` gives the untruncated string on hover,
 * because a 30-character Arabic name in a 200px column is going to be cut.
 */
export function CellIdentity({
    name,
    identifier,
    className,
}: {
    name: string
    identifier?: string | null
    className?: string
}) {
    /*
     * The identifier is a SECOND line only when it says something the name does not.
     *
     * Today every one of the 189 products has its SKU as its name — recorded in the P7
     * report as the naming problem still to be solved — so stacking both printed
     * "nl-601c-10w" directly above "nl-601c-10w" on every row. That cost 15px per row,
     * pushed the compact row from 34px to 49px, and lost four visible rows a screen to
     * render the same string twice.
     *
     * Collapsing them is not hiding the problem: a row whose name IS its SKU now shows one
     * mono identifier and no display name, which is exactly what the data says.
     */
    const redundant = !identifier || identifier === name

    if (redundant) {
        return (
            <bdi dir="auto" className={cn("block truncate font-mono text-sm", className)} title={name}>
                {name}
            </bdi>
        )
    }

    return (
        <div className={cn("flex min-w-0 items-baseline gap-1.5", className)}>
            <CellText className="font-medium" title={name}>
                {name}
            </CellText>
            <bdi dir="auto" className="shrink-0 font-mono text-2xs text-muted-foreground">
                {identifier}
            </bdi>
        </div>
    )
}
