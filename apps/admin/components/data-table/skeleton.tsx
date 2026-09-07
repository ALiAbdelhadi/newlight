import { cn } from "@/lib/utils"
import type { TableState } from "@/lib/table-params"

const ROW_HEIGHT: Record<TableState["density"], string> = {
    compact: "h-[34px]",
    comfortable: "h-[44px]",
    dense: "h-[28px]",
}

/**
 * Loading rows shaped like the real ones (§11, §19).
 *
 * A spinner in place of a table tells you nothing and moves everything: the header vanishes,
 * the page height collapses, and when the data lands the whole layout jumps. Rows of the
 * right height in the right number of columns hold the layout still, so the only thing that
 * changes on arrival is the text.
 *
 * Widths vary per column on a fixed cycle rather than randomly — random widths re-roll on
 * every render and make the skeleton shimmer with a second, meaningless animation.
 */
const WIDTHS = ["w-24", "w-32", "w-16", "w-20", "w-28", "w-14"]

export function DataTableSkeleton({
    columns,
    rows,
    density,
}: {
    columns: number
    rows: number
    density: TableState["density"]
}) {
    return (
        <>
            {Array.from({ length: rows }, (_, rowIndex) => (
                <tr key={rowIndex} className={cn(ROW_HEIGHT[density], "border-b")}>
                    {Array.from({ length: columns }, (_, columnIndex) => (
                        <td key={columnIndex} className="px-2.5">
                            <div
                                className={cn(
                                    "h-3 animate-pulse rounded bg-muted",
                                    WIDTHS[(rowIndex + columnIndex) % WIDTHS.length]
                                )}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}
