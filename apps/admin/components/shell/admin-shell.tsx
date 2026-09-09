"use client"

import { useState, type ReactNode } from "react"

import { CommandPalette } from "@/components/command-palette"
import { Sidebar } from "@/components/shell/sidebar"
import { TopBar } from "@/components/shell/top-bar"
import type { DashboardStats } from "@/types"

interface AdminShellProps {
    stats: DashboardStats
    user: { name: string; email: string } | null
    children: ReactNode
}

export function AdminShell({ stats, user, children }: AdminShellProps) {
    const [paletteOpen, setPaletteOpen] = useState(false)

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <a
                href="#content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:bg-card focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium"
            >
                Skip to content
            </a>

            <Sidebar stats={stats} user={user} />

            <div className="flex min-w-0 flex-1 flex-col">
                <TopBar onOpenPalette={() => setPaletteOpen(true)} stats={stats} />
                <main id="content" tabIndex={-1} className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>

            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </div>
    )
}
