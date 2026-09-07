"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { cn } from "@/lib/utils"
import { NAVIGATION, OVERVIEW, activeDomainId, isSurfaceActive, type NavSurface } from "@/lib/navigation"
import type { DashboardStats } from "@/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * The navigation rail (P4.5 §7.1).
 *
 * What this replaces was not a styling problem, it was an availability one. The old sidebar
 * defaulted to CLOSED and collapsed to `width: 0; display: none`, so an operator landed on
 * the panel with no navigation at all and had to find a chevron before they could go
 * anywhere. On top of that it was a glass panel — `bg-white/10 backdrop-blur-md shadow-xl`,
 * a gradient logo tile, `rounded-xl` on every row, 48px rows animated by framer-motion —
 * which is the vocabulary of a marketing dashboard, not a tool somebody works inside for
 * six hours.
 *
 * The rules here are the opposite ones:
 *
 *   NAVIGATION IS NEVER ABSENT. Collapsed means a 48px icon rail, not zero. Every
 *   destination stays one click away, and the icons keep accessible names through tooltips.
 *
 *   THE ACTIVE SURFACE IS OBVIOUS WITHOUT COLOUR. A 2px bar on the leading edge, a filled
 *   row, AND `aria-current="page"`. Colour alone fails the operator with a bad monitor and
 *   the one using a screen reader, and those are the same failure.
 *
 *   DENSITY. 30px rows and 12.5px labels put fourteen surfaces and six domain headings on
 *   screen without scrolling. The old sidebar needed a scroll area for thirteen flat items.
 *
 * Motion is one property: width, 160ms. That is the only width animation in the application.
 */

const RAIL_STORAGE_KEY = "admin.sidebar.collapsed"

/**
 * The collapsed preference as an external store, rather than state seeded from an effect.
 *
 * It has to be read from localStorage, which does not exist on the server, so the naive
 * shapes are both wrong: a lazy `useState` initialiser runs during render on both sides and
 * hydrates mismatched, while `setState` inside an effect triggers the cascading re-render
 * the compiler lint rule exists to catch. `useSyncExternalStore` is the shape React provides
 * for exactly this — a server snapshot that is always "expanded", and a client snapshot read
 * from storage.
 *
 * Module scope, so every mount of the sidebar agrees and a second tab picks up the change
 * through the `storage` event.
 */
let collapsedCache: boolean | null = null
const collapsedListeners = new Set<() => void>()

function readCollapsed(): boolean {
    if (collapsedCache === null) {
        try {
            collapsedCache = window.localStorage.getItem(RAIL_STORAGE_KEY) === "1"
        } catch {
            collapsedCache = false // private mode, blocked storage — expanded is the safe default
        }
    }
    return collapsedCache
}

function subscribeCollapsed(onChange: () => void) {
    collapsedListeners.add(onChange)
    const onStorage = (event: StorageEvent) => {
        if (event.key !== RAIL_STORAGE_KEY) return
        collapsedCache = event.newValue === "1"
        onChange()
    }
    window.addEventListener("storage", onStorage)
    return () => {
        collapsedListeners.delete(onChange)
        window.removeEventListener("storage", onStorage)
    }
}

function setCollapsed(next: boolean) {
    collapsedCache = next
    try {
        window.localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0")
    } catch {
        /* the preference simply does not persist */
    }
    for (const listener of collapsedListeners) listener()
}

interface SidebarProps {
    stats: DashboardStats
    user: { name: string; email: string } | null
}

export function Sidebar({ stats, user }: SidebarProps) {
    const pathname = usePathname()
    const openDomain = activeDomainId(pathname)

    const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false)
    const toggle = () => setCollapsed(!collapsed)

    return (
        <TooltipProvider delayDuration={200} disableHoverableContent>
            <aside
                data-collapsed={collapsed}
                aria-label="Main"
                className={cn(
                    "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r bg-sidebar",
                    "transition-[width] duration-[160ms] ease-out-fast",
                    collapsed ? "w-12" : "w-56"
                )}
            >
                {/* Brand row — same 44px as the top bar, so the two align across the seam. */}
                <div
                    className={cn(
                        "flex h-11 shrink-0 items-center border-b",
                        collapsed ? "justify-center px-0" : "gap-2 pr-1 pl-3"
                    )}
                >
                    <div
                        aria-hidden
                        className="grid size-5 shrink-0 place-items-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground"
                    >
                        N
                    </div>
                    {!collapsed && (
                        <>
                            <span className="truncate text-sm font-semibold tracking-tight">NewLight</span>
                            <span className="ml-auto rounded border px-1 py-px font-mono text-[9px] text-muted-foreground">
                                ERP
                            </span>
                        </>
                    )}
                    {!collapsed && <RailToggle collapsed={collapsed} onToggle={toggle} />}
                </div>

                {collapsed && (
                    <div className="flex justify-center border-b py-1">
                        <RailToggle collapsed={collapsed} onToggle={toggle} />
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5">
                    <div className={cn(collapsed ? "px-1.5" : "px-2")}>
                        <NavRow surface={OVERVIEW} pathname={pathname} collapsed={collapsed} stats={stats} />
                    </div>

                    {NAVIGATION.map((domain) => (
                        <div key={domain.id} className={cn("mt-1", collapsed ? "px-1.5" : "px-2")}>
                            {collapsed ? (
                                // The label cannot fit, so the grouping is carried by a rule.
                                <div aria-hidden className="mx-1 my-1.5 border-t" />
                            ) : (
                                <div
                                    className={cn(
                                        "px-2 pt-2 pb-1 text-[10px] font-semibold tracking-[0.09em] uppercase",
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
                                />
                            ))}
                        </div>
                    ))}
                </nav>

                {user && !collapsed && (
                    /*
                     * pb-8 clears Next's development indicator, which is pinned to the
                     * bottom-left corner and sat directly on top of the collapse control
                     * when it lived down here — an unclickable button in dev is a bug even
                     * though the badge is absent in production.
                     */
                    <div className="shrink-0 border-t px-3 pt-2 pb-8">
                        <div className="truncate text-xs font-medium">{user.name}</div>
                        <div className="truncate text-2xs text-muted-foreground">{user.email}</div>
                    </div>
                )}
            </aside>
        </TooltipProvider>
    )
}

function NavRow({
    surface,
    pathname,
    collapsed,
    stats,
}: {
    surface: NavSurface
    pathname: string
    collapsed: boolean
    stats: DashboardStats
}) {
    const active = isSurfaceActive(surface, pathname)
    const Icon = surface.icon
    const count = surface.badge?.(stats)

    const row = (
        <Link
            href={surface.href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "relative flex h-[30px] items-center rounded-md text-[12.5px]",
                "transition-colors duration-(--duration-fast)",
                collapsed ? "justify-center px-0" : "gap-2 px-2.5",
                active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
        >
            {active && (
                <span
                    aria-hidden
                    className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                />
            )}
            <Icon className={cn("size-3.5 shrink-0", active && "text-primary")} />
            {!collapsed && (
                <>
                    <span className="truncate">{surface.label}</span>
                    {count !== undefined && (
                        <span
                            className={cn(
                                "ml-auto shrink-0 rounded px-1 py-px text-[10px] tabular-nums",
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

function RailToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
            className={cn(
                "grid size-6 shrink-0 place-items-center rounded text-muted-foreground",
                "transition-colors duration-(--duration-fast) hover:bg-accent hover:text-foreground"
            )}
        >
            <Icon className="size-3.5" />
        </button>
    )
}
