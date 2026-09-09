"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { NAVIGATION, OVERVIEW, activeDomainId, isSurfaceActive, type NavSurface } from "@/lib/navigation"
import type { DashboardStats } from "@/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function NavList({
    pathname,
    collapsed = false,
    stats,
    onNavigate,
}: {
    pathname: string
    collapsed?: boolean
    stats: DashboardStats
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
