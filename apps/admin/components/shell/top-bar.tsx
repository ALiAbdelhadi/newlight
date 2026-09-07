"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import { ChevronRight, Search } from "lucide-react"

import { breadcrumbsFor } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { AccountMenu } from "@/components/shell/account-menu"

/**
 * The top bar (P4.5 §7.1): breadcrumbs, search, the palette trigger, the account menu.
 *
 * What it replaces — `dashboard-header.tsx` — showed a package icon linking to `/`, a route
 * the admin app does not serve, and the page's name in 20px. It answered "what page is
 * this?" and nothing else. Breadcrumbs answer "where am I in the system?", which is the
 * question that matters once there are thirty surfaces in six domains, and they are the
 * cheapest form of state legibility in §1.4.
 *
 * 44px tall, aligned with the sidebar's brand row so the seam between them is a straight
 * line rather than a step.
 */

interface TopBarProps {
    onOpenPalette: () => void
}

export function TopBar({ onOpenPalette }: TopBarProps) {
    const pathname = usePathname()
    const crumbs = breadcrumbsFor(pathname)

    return (
        <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-3 border-b bg-card px-3">
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
                <ol className="flex items-center gap-1 text-xs">
                    {crumbs.map((crumb, index) => {
                        const last = index === crumbs.length - 1
                        return (
                            <Fragment key={`${crumb.label}-${index}`}>
                                {index > 0 && (
                                    <ChevronRight aria-hidden className="size-3 shrink-0 text-muted-foreground/60" />
                                )}
                                <li className="min-w-0">
                                    {crumb.href && !last ? (
                                        <Link
                                            href={crumb.href}
                                            className="truncate text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground"
                                        >
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span
                                            aria-current={last ? "page" : undefined}
                                            className={cn(
                                                "truncate",
                                                last ? "font-medium text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            {crumb.label}
                                        </span>
                                    )}
                                </li>
                            </Fragment>
                        )
                    })}
                </ol>
            </nav>

            {/*
             * Styled as an input because that is what it behaves like once open, but it is a
             * button: there is nothing to type into here, and a real input that silently
             * forwards every keystroke to a dialog is a worse lie than a button that opens one.
             */}
            <button
                type="button"
                onClick={onOpenPalette}
                className={cn(
                    "hidden h-[26px] items-center gap-2 rounded-md border border-border-strong bg-background px-2 sm:flex",
                    "text-xs text-muted-foreground transition-colors duration-(--duration-fast)",
                    "hover:border-ring hover:text-foreground"
                )}
            >
                <Search aria-hidden className="size-3.5" />
                <span className="w-32 text-left">Search…</span>
                <kbd className="rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
            </button>

            <AccountMenu />
        </header>
    )
}
