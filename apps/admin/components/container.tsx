import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
}

/**
 * The page's content box.
 *
 * This used to be `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` — a centred 1280px column with up
 * to 32px of side padding. That is the right shape for an article and the wrong one for this
 * application: it capped every table at 1280px, so an operator on a 2560px monitor got
 * 1280px of products and 1280px of empty margin, and the columns they had paid for in screen
 * real estate were squeezed or truncated instead.
 *
 * Full bleed now, with the §3.2 page padding — 16px sides, 12px top, 24px bottom. Prose and
 * forms do not want full bleed either, but that is what ProseColumn is for; a list surface
 * should use every pixel it is given.
 */
export function Container({
    children,
    className = "",
    ...props
}: ContainerProps) {
    return (
        <div
            className={cn(
                "w-full px-4 pt-3 pb-6",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * A measured column for reading and for forms.
 *
 * 720px is roughly 90 characters at 13px, past the comfortable limit for running text but
 * right for a labelled form where the label and its control share a line. Record prose uses
 * it; tables never do.
 */
export function ProseColumn({
    children,
    className = "",
    ...props
}: ContainerProps) {
    return (
        <div className={cn("w-full max-w-[720px]", className)} {...props}>
            {children}
        </div>
    )
}
