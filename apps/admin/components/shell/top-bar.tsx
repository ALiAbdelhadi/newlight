"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import { ChevronRight, Search } from "lucide-react"

import { breadcrumbsFor } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { AccountMenu } from "@/components/shell/account-menu"
import { MobileNav } from "@/components/shell/mobile-nav"
import { NotificationBell } from "@/components/shell/notification-bell"
import type { DashboardStats } from "@/types"

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
    stats: DashboardStats
}

export function TopBar({ onOpenPalette, stats }: TopBarProps) {
    const pathname = usePathname()
    const crumbs = breadcrumbsFor(pathname)

    return (
        <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-2 border-b bg-card px-3 sm:gap-3">
            {/* Below `md` the rail is gone and this is the only way into the navigation. */}
            <MobileNav stats={stats} />

            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
                <ol className="flex items-center gap-1 text-xs">
                    {crumbs.map((crumb, index) => {
                        const last = index === crumbs.length - 1
                        return (
                            <Fragment key={`${crumb.label}-${index}`}>
                                {index > 0 && (
                                    <ChevronRight aria-hidden className="size-3 shrink-0 text-muted-foreground" />
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
                /*
                 * Search is not a desktop-only capability. Under `sm` the label and the ⌘K hint
                 * are dropped — a phone has no ⌘ key and no room for a 128px field — but the
                 * control itself stays, as a square icon button with an accessible name.
                 */
                aria-label="Search"
                className={cn(
                    "flex h-[26px] items-center gap-2 rounded-md border border-border-strong bg-background",
                    "max-sm:w-[26px] max-sm:justify-center max-sm:px-0 sm:px-2",
                    "text-xs text-muted-foreground transition-colors duration-(--duration-fast)",
                    "hover:border-ring hover:text-foreground"
                )}
            >
                <Search aria-hidden className="size-3.5" />
                <span className="hidden w-32 text-left sm:block">Search…</span>
                <kbd className="hidden rounded border bg-muted px-1 font-mono text-2xs text-muted-foreground sm:block">
                    ⌘K
                </kbd>
            </button>

            {/* Before the account menu: notifications are about the business, the account
                menu is about you, and the more operational control reads first. */}
            <NotificationBell />

            <AccountMenu />
        </header>
    )
}
