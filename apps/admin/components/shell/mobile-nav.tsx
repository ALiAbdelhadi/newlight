"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"

import { NavList } from "@/components/shell/nav-list"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { DashboardStats } from "@/types"

/**
 * Navigation below `md` (P4.5 §22).
 *
 * The rail is `hidden md:flex`, so under 768px there was no navigation at all — the panel
 * opened on whatever screen the URL named and offered no way to leave it. That is the same
 * defect the old collapsed-to-zero sidebar had, arrived at from the other direction.
 *
 * A drawer rather than a squeezed rail: 224px of a 375px viewport is 60% of the screen given
 * to chrome. The drawer is the same `NavList` the rail renders, so a surface cannot exist on
 * one and be missing from the other.
 *
 * It closes on navigation. A drawer still standing over the page an operator just asked for is
 * the single most common mobile-navigation bug, and `pathname` changing is the only reliable
 * signal that the navigation actually happened — closing in the click handler closes it before
 * the route resolves, which flashes the old page.
 *
 * The close is derived DURING RENDER rather than in an effect. React's own documented pattern
 * for "state that has to reset when a prop changes" is to compare the previous value in render
 * and call setState there; an effect would render the open drawer once over the new page, then
 * re-render to close it, which is the cascading render the compiler lint rule rejects.
 */
export function MobileNav({ stats }: { stats: DashboardStats }) {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const [lastPathname, setLastPathname] = useState(pathname)

    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        if (open) setOpen(false)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    aria-label="Open navigation"
                    className="grid size-7 shrink-0 place-items-center rounded-md border border-border-strong text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-accent hover:text-foreground md:hidden"
                >
                    <Menu aria-hidden className="size-3.5" />
                </button>
            </SheetTrigger>

            <SheetContent side="left" className="w-64 gap-0 p-0">
                <div className="flex h-11 shrink-0 items-center gap-2 border-b pr-1 pl-3">
                    <div
                        aria-hidden
                        className="grid size-5 shrink-0 place-items-center rounded-sm bg-primary text-2xs font-bold text-primary-foreground"
                    >
                        N
                    </div>
                    <SheetTitle className="truncate text-sm font-semibold tracking-tight">NewLight</SheetTitle>
                </div>

                <nav aria-label="Main" className="flex-1 overflow-y-auto py-1.5">
                    {/* NavList reaches for a Tooltip only when collapsed, which it never is here —
                        the provider is present anyway so the component has one contract. */}
                    <TooltipProvider delayDuration={200} disableHoverableContent>
                        <NavList pathname={pathname} stats={stats} />
                    </TooltipProvider>
                </nav>
            </SheetContent>
        </Sheet>
    )
}
