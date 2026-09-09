import { PageBody } from "@/components/page"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * The route-level loading state (P4.5 §19).
 *
 * There was none. Every admin route is `force-dynamic`, so navigating between two of them left
 * the previous screen on display, fully interactive, until the new one's queries returned —
 * an operator could click a row on a page they had already navigated away from.
 *
 * It sits under `/admin`, so it covers every surface that does not supply its own. The shape
 * is deliberately generic and LAYOUT-PRESERVING: a header band the height of a real
 * `PageHeader`, a toolbar band, and rows at the compact density. A spinner would say "wait";
 * this says "the thing you asked for is this shape", which is the difference between a loading
 * state and a stall.
 *
 * No pulse on the row block: twelve pulsing bars at 34px is a strobe. The header and toolbar
 * animate because they are two small elements; the rows are static and simply grey.
 */
export default function AdminLoading() {
    return (
        <>
            <div className="shrink-0 border-b bg-card px-4 pt-3 pb-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-1.5 h-3 w-80" />
            </div>

            <PageBody>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-[30px] w-56" />
                    <Skeleton className="h-[30px] w-40" />
                    <Skeleton className="ml-auto h-[30px] w-24" />
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border">
                    <div className="h-8 border-b border-border-strong bg-surface-sunk" />
                    <ul>
                        {Array.from({ length: 12 }).map((_, index) => (
                            <li
                                key={index}
                                aria-hidden
                                className="flex h-[34px] items-center gap-3 border-b px-2.5 last:border-b-0"
                            >
                                <span className="h-2.5 w-[22%] rounded-sm bg-muted" />
                                <span className="h-2.5 w-[16%] rounded-sm bg-muted" />
                                <span className="h-2.5 w-[12%] rounded-sm bg-muted" />
                                <span className="ml-auto h-2.5 w-[8%] rounded-sm bg-muted" />
                            </li>
                        ))}
                    </ul>
                </div>
            </PageBody>

            {/* The one thing a screen reader needs from this. The visual skeleton is decoration
                to it, and announcing twelve grey bars would be worse than announcing nothing. */}
            <span role="status" aria-live="polite" className="sr-only">
                Loading…
            </span>
        </>
    )
}
