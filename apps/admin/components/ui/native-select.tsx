import { cn } from "@/lib/utils"

/**
 * A plain `<select>`, styled once (P4.5 §22).
 *
 * Eight forms in the panel had each written out the same forty-character class string by hand —
 * `w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs …` — which
 * is not one control appearing eight times, it is eight controls that currently agree. Two of
 * them had already drifted with a trailing `disabled:opacity-50` the others lacked.
 *
 * It is deliberately NOT the Radix `Select`. That one is right where the options need icons,
 * grouping or a search; a native select is right for a short fixed list inside a form, because
 * it is one element, needs no JavaScript, and on a phone it opens the platform's own picker
 * rather than a scrolling div. The panel uses both, on purpose, for those two jobs.
 *
 * `appearance-none` is deliberately absent: with no custom chevron drawn on top, removing the
 * platform's own would leave a control that does not look like it opens.
 */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
    return (
        <select
            data-slot="native-select"
            className={cn(
                "h-[30px] w-full rounded-md border border-input bg-transparent px-2 text-sm",
                "transition-colors duration-(--duration-fast) outline-none",
                "focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
}
