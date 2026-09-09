"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { NAVIGATION, OVERVIEW, activeDomainId, isSurfaceActive, type NavSurface } from "@/lib/navigation"
import type { DashboardStats } from "@/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * The navigation rows themselves, extracted so the desktop rail and the mobile drawer render
 * the SAME markup from the SAME array.
 *
 * The alternative — a second copy inside the drawer — is how a surface ends up reachable on a
 * laptop and missing on a phone, and how the active-state rule drifts between the two. There
 * is one `NavRow` in the application.
 */

export function NavList({
    pathname,
    collapsed = false,
    stats,
    onNavigate,
}: {
    pathname: string
    collapsed?: boolean
    stats: DashboardStats
    /** The drawer closes on navigation; the rail does nothing. */
    onNavigate?: () => void
}) {
    const openDomain = activeDomainId(pathname)

    return (
        <>
            <div className={cn(collapsed ? "px-1.5" : "px-2")}>
                <NavRow
                    surface={OVERVIEW}
                    pathname={pathname}
                    collapsed={collapsed}
                    stats={stats}
                    onNavigate={onNavigate}
                />
            </div>

            {NAVIGATION.map((domain) => (
                <div key={domain.id} className={cn("mt-1", collapsed ? "px-1.5" : "px-2")}>
                    {collapsed ? (
                        // The label cannot fit, so the grouping is carried by a rule.
                        <div aria-hidden className="mx-1 my-1.5 border-t" />
                    ) : (
                        <div
                            className={cn(
                                "px-2 pt-2 pb-1 text-2xs font-semibold tracking-label uppercase",
                                domain.id === openDomain ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {domain.label}
                        </div>
                    )}
                    {domain.surfaces.map((surface) => (
                        <NavRow
                            key={surface.href}
                            surface={surface}
                            pathname={pathname}
                            collapsed={collapsed}
                            stats={stats}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            ))}
        </>
    )
}

function NavRow({
    surface,
    pathname,
    collapsed,
    stats,
    onNavigate,
}: {
    surface: NavSurface
    pathname: string
    collapsed: boolean
    stats: DashboardStats
    onNavigate?: () => void
}) {
    const active = isSurfaceActive(surface, pathname)
    const Icon = surface.icon
    const count = surface.badge?.(stats)

    const row = (
        <Link
            href={surface.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
                "relative flex items-center rounded-md text-xs",
                "transition-colors duration-(--duration-fast)",
                /*
                 * 30px on the rail, 36px in the drawer. A 30px target is fine for a cursor and
                 * below the 44px a thumb wants; the drawer is the touch surface, so it is the
                 * one that grows. Both stay inside the same row component so the active state
                 * cannot diverge.
                 */
                collapsed ? "h-[30px] justify-center px-0" : "h-[30px] gap-2 px-2.5 max-md:h-9 max-md:text-sm",
                active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
        >
            {active && (
                <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />
            )}
            <Icon className={cn("size-3.5 shrink-0", active && "text-primary")} />
            {!collapsed && (
                <>
                    <span className="truncate">{surface.label}</span>
                    {count !== undefined && (
                        <span
                            className={cn(
                                "ml-auto shrink-0 rounded px-1 py-px text-2xs tabular-nums",
                                surface.badgeTone === "attention"
                                    ? "bg-warning-bg text-warning"
                                    : "text-muted-foreground"
                            )}
                        >
                            {count}
                        </span>
                    )}
                </>
            )}
        </Link>
    )

    if (!collapsed) return row

    // Collapsed, the label is the only thing naming the destination, so it must still exist.
    return (
        <Tooltip>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
                {surface.label}
                {count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{count}</span>}
            </TooltipContent>
        </Tooltip>
    )
}
