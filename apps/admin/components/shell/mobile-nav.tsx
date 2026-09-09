"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"

import { NavList } from "@/components/shell/nav-list"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { DashboardStats } from "@/types"

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
                    <TooltipProvider delayDuration={200} disableHoverableContent>
                        <NavList pathname={pathname} stats={stats} />
                    </TooltipProvider>
                </nav>
            </SheetContent>
        </Sheet>
    )
}
