"use client"

import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { cn } from "@/lib/utils"
import { NavList } from "@/components/shell/nav-list"
import type { DashboardStats } from "@/types"
import { TooltipProvider } from "@/components/ui/tooltip"

const RAIL_STORAGE_KEY = "admin.sidebar.collapsed"

let collapsedCache: boolean | null = null
const collapsedListeners = new Set<() => void>()

function readCollapsed(): boolean {
    if (collapsedCache === null) {
        try {
            collapsedCache = window.localStorage.getItem(RAIL_STORAGE_KEY) === "1"
        } catch {
            collapsedCache = false
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
    }
    for (const listener of collapsedListeners) listener()
}

interface SidebarProps {
    stats: DashboardStats
    user: { name: string; email: string } | null
}

export function Sidebar({ stats, user }: SidebarProps) {
    const pathname = usePathname()

    const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false)
    const toggle = () => setCollapsed(!collapsed)

    return (
        <TooltipProvider delayDuration={200} disableHoverableContent>
            <aside
                data-collapsed={collapsed}
                aria-label="Main"
                className={cn(
                    "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-sidebar md:flex",
                    "transition-[width] duration-[160ms] ease-out-fast",
                    collapsed ? "w-12" : "w-56"
                )}
            >
                <div
                    className={cn(
                        "flex h-11 shrink-0 items-center border-b",
                        collapsed ? "justify-center px-0" : "gap-2 pr-1 pl-3"
                    )}
                >
                    <div
                        aria-hidden
                        className="grid size-5 shrink-0 place-items-center rounded-sm bg-primary text-2xs font-bold text-primary-foreground"
                    >
                        N
                    </div>
                    {!collapsed && (
                        <>
                            <span className="truncate text-sm font-semibold tracking-tight">NewLight</span>
                            <span className="ml-auto rounded border px-1 py-px font-mono text-2xs text-muted-foreground">
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
                    <NavList pathname={pathname} collapsed={collapsed} stats={stats} />
                </nav>

                {user && !collapsed && (
                    <div className="shrink-0 border-t px-3 pt-2 pb-8">
                        <div className="truncate text-xs font-medium">{user.name}</div>
                        <div className="truncate text-2xs text-muted-foreground">{user.email}</div>
                    </div>
                )}
            </aside>
        </TooltipProvider>
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
