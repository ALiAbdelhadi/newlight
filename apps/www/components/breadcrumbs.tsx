import { ChevronRight } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export interface Crumb {
    name: string
    href?: string
}

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
