"use client"

import { useState, type ReactNode } from "react"

import { CommandPalette } from "@/components/command-palette"
import { Sidebar } from "@/components/shell/sidebar"
import { TopBar } from "@/components/shell/top-bar"
import type { DashboardStats } from "@/types"

/**
 * The application shell (P4.5 §7.1).
 *
 * Two columns. The sidebar is `position: sticky` at full viewport height; the content region
 * is the only thing that scrolls. That is the requirement "the content region must scroll
 * independently from navigation", and it is why the document itself does not scroll —
 * scrolling a list of two hundred products must never carry the navigation off screen.
 *
 * The palette's open state lives here rather than inside the top bar, because two things
 * open it: the trigger, and ⌘K from anywhere in the application.
 */

interface AdminShellProps {
    stats: DashboardStats
    user: { name: string; email: string } | null
    children: ReactNode
}

export function AdminShell({ stats, user, children }: AdminShellProps) {
    const [paletteOpen, setPaletteOpen] = useState(false)

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/*
             * Keyboard users tab into the shell before the page, and the shell is fifteen
             * links deep. Visually hidden until focused, then a real, visible control — an
             * off-screen skip link that never appears is one nobody can use.
             */}
            <a
                href="#content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:bg-card focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium"
            >
                Skip to content
            </a>

            <Sidebar stats={stats} user={user} />

            {/* min-w-0: without it a wide table stretches this track and the sidebar is pushed
                off screen instead of the table scrolling inside its own container. */}
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
