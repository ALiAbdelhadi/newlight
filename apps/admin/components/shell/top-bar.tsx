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

interface TopBarProps {
    onOpenPalette: () => void
    stats: DashboardStats
}

export function TopBar({ onOpenPalette, stats }: TopBarProps) {
    const pathname = usePathname()
    const crumbs = breadcrumbsFor(pathname)

    return (
        <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-2 border-b bg-card px-3 sm:gap-3">
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

            <button
                type="button"
                onClick={onOpenPalette}
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

            <NotificationBell />

            <AccountMenu />
        </header>
    )
}
