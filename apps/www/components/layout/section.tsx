import { cn } from "@/lib/utils"

/**
 * THE storefront layout primitives.
 *
 * The counterpart of `apps/admin/components/page`, and deliberately a different shape: the
 * panel's primitives are about density (34px rows, 12px padding, a full-bleed masthead), these
 * are about rhythm and reading. What they share is that in both applications there is now
 * exactly ONE answer to "how wide is the page", "how much space is between two sections" and
 * "how big is a heading".
 *
 * Before this, every section chose for itself. Across the storefront's twenty-odd sections and
 * pages there were four container widths (`max-w-7xl`, `max-w-6xl`, `max-w-4xl`, `max-w-3xl`),
 * three gutters (`px-4 sm:px-6 lg:px-8`, `px-8 sm:px-12 lg:px-20`, `px-6`), and vertical
 * rhythm ranging from `py-16` to `py-40` — with `mb-24 lg:mb-32` inside one of them. None of
 * that was a decision anybody made twice; it was a decision nobody made once.
 *
 * All of these are server components. Nothing here needs the client.
 */

/* ------------------------------------------------------------------ container */

export function Container({
    children,
    className,
    width = "default",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    /**
     * `default` — the catalogue and most pages, 1280px.
     * `prose`   — running text: policy pages, about copy. About 75 characters.
     * `wide`    — full-bleed with gutters only, for edge-to-edge imagery.
     */
    width?: "default" | "prose" | "wide"
}) {
    return (
        <div
            className={cn(
                "mx-auto w-full px-5 lg:px-10",
                width === "default" && "max-w-[1280px]",
                width === "prose" && "max-w-[68ch]",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/* -------------------------------------------------------------------- section */

/**
 * A band of the page.
 *
 * `tone` is the only surface decision a section makes, and there are three: the page ground,
 * the sunk band that separates one stretch of content from the next, and inverted for the rare
 * moment that wants to be dark. A section does not get to pick a colour.
 */
export function Section({
    children,
    className,
    tone = "default",
    spacing = "default",
    ...props
}: React.HTMLAttributes<HTMLElement> & {
    tone?: "default" | "sunk" | "inverted"
    /** `tight` for stacked content sections, `default` for marketing bands. */
    spacing?: "tight" | "default"
}) {
    return (
        <section
            className={cn(
                spacing === "default" ? "py-20 lg:py-28" : "py-12 lg:py-16",
                /*
                 * A sunk band carries its own top edge.
                 *
                 * Alternating tone is how the page separates one stretch from the next, and it
                 * works right up until two sunk sections end up adjacent — which is not a
                 * hypothetical here, because several bands render conditionally. Best sellers
                 * disappears until the shop has orders, and the moment it does the "new
                 * arrivals" strip and the lookbook below it become one undivided grey field.
                 *
                 * The border makes the edge a property of the surface rather than of the order,
                 * so no caller has to reason about which of its neighbours happens to be
                 * rendering today.
                 */
                tone === "sunk" && "border-t bg-surface-sunk",
                tone === "inverted" && "bg-foreground text-background",
                className
            )}
            {...props}
        >
            {children}
        </section>
    )
}

/* ------------------------------------------------------------- section header */

export interface SectionHeaderProps {
    /** Small label above the title. The section's category, not a slogan. */
    eyebrow?: string
    title: string
    description?: React.ReactNode
    /** A link or button, right-aligned on wide screens and below the text on narrow ones. */
    action?: React.ReactNode
    /** Centres the block. For a section that is one statement rather than a list's heading. */
    align?: "start" | "center"
    /** `display` sets the title in Playfair — for the two or three moments that earn it. */
    face?: "display" | "sans"
    className?: string
}

/**
 * The heading block above a section's content.
 *
 * The `h2` is here so a page's heading outline is `h1` (the page) then `h2` (each section),
 * which is what a screen reader's heading list needs. The storefront had sections rendering
 * bare `h2`s under a page that never declared an `h1`, and the header's logo rendering an `h1`
 * on every route — so the outline of every page began with the word "NEWLIGHT".
 *
 * `face="display"` is opt-in and should stay rare. Playfair italic at 60px is the brand's
 * signature; used on all six sections of the homepage it stops being a signature and becomes
 * the body font.
 */
export function SectionHeader({
    eyebrow,
    title,
    description,
    action,
    align = "start",
    face = "sans",
    className,
}: SectionHeaderProps) {
    return (
        <div
            className={cn(
                "mb-10 flex flex-col gap-4 lg:mb-14 lg:flex-row lg:items-end lg:justify-between",
                align === "center" && "lg:flex-col lg:items-center",
                className
            )}
        >
            <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
                {eyebrow && (
                    <p className="mb-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                        {eyebrow}
                    </p>
                )}
                <h2
                    className={cn(
                        "text-balance",
                        face === "display"
                            ? "font-display text-4xl italic lg:text-5xl"
                            : "text-3xl font-semibold tracking-tight lg:text-4xl"
                    )}
                >
                    {title}
                </h2>
                {description && (
                    <p className="mt-4 text-lg text-pretty text-muted-foreground">{description}</p>
                )}
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}

/* ---------------------------------------------------------------- page header */

/**
 * The masthead of a content page — the order list, a policy page, contact.
 *
 * Not for the homepage or a product page: those lead with an image, and a title band above a
 * hero is the thing that makes a storefront look like a documentation site.
 *
 * It owns the `h1`. Exactly one per page.
 */
export function PageHeader({
    eyebrow,
    title,
    description,
    action,
    className,
}: {
    eyebrow?: string
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("border-b py-10 lg:py-14", className)}>
            <Container>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        {eyebrow && (
                            <p className="mb-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                                {eyebrow}
                            </p>
                        )}
                        <h1 className="text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-4 text-lg text-pretty text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            </Container>
        </div>
    )
}

/* --------------------------------------------------------------------- prose */

/**
 * Long-form copy — the privacy policy, the about text.
 *
 * One place that decides what a paragraph, a list and a sub-heading look like inside running
 * text, so a policy page does not hand-style thirty elements.
 */
export function Prose({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "max-w-[68ch] text-base leading-relaxed text-muted-foreground",
                "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
                "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
                "[&_p]:mb-4",
                "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:ps-5 [&_li]:mb-1.5",
                "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:ps-5",
                "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4",
                "[&_strong]:font-semibold [&_strong]:text-foreground",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
