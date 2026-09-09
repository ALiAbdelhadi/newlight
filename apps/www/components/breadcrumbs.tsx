import { ChevronRight } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export interface Crumb {
    name: string
    /** Omitted on the last entry — the page you are on is not a link to itself. */
    href?: string
}

/**
 * The trail, once.
 *
 * The product page drew one by hand; the catalogue and the listing had a "← Indoor Lighting"
 * back link instead, which answers a different question. A back link says where you came from,
 * a breadcrumb says where you ARE — and on a catalogue three levels deep, arriving from a
 * search result with no history, the second is the one a customer needs.
 *
 * Plain markup with no client hooks, so a client page can render it as readily as a server one.
 * The machine-readable half is `breadcrumbSchema` in `lib/structured-data.tsx`, emitted by the
 * same pages: Google draws this trail under a result in place of the raw URL, and a page that
 * shows one to people and not to crawlers is doing the work without the benefit.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
    if (items.length === 0) return null

    return (
        <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {items.map((item, index) => {
                    const last = index === items.length - 1
                    return (
                        <li key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-2">
                            {index > 0 && (
                                <ChevronRight aria-hidden className="size-3 shrink-0 text-muted-foreground rtl:rotate-180" />
                            )}
                            {item.href && !last ? (
                                <Link
                                    href={item.href}
                                    className="truncate tracking-label uppercase transition-colors duration-(--duration-fast) hover:text-foreground"
                                >
                                    <bdi dir="auto">{item.name}</bdi>
                                </Link>
                            ) : (
                                <span
                                    aria-current={last ? "page" : undefined}
                                    className="truncate tracking-label text-foreground uppercase"
                                >
                                    <bdi dir="auto">{item.name}</bdi>
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
