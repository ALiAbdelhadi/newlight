"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@/components/ui/command"
import { NAVIGATION, OVERVIEW } from "@/lib/navigation"

/**
 * ⌘K / Ctrl+K (P4.5 §10).
 *
 * The Navigate group is built from `lib/navigation.ts`, the same array the sidebar renders,
 * so a surface cannot exist in one and be missing from the other — which is the failure mode
 * of every hand-maintained palette.
 *
 * This ships with Navigate only. Product search and record actions land with the DataTable
 * and RecordLayout, because both need a server action that does not exist yet, and a search
 * box that silently returns nothing is worse than no search box. The trigger in the top bar
 * is real today: it opens this.
 */

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter()

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return
            /*
             * Claim the shortcut before the browser does — Ctrl+K focuses the address bar in
             * Chrome, and an operator who hits it expecting the palette should not land in
             * the URL bar. Meta+K is unclaimed on macOS, but the handling is the same.
             */
            event.preventDefault()
            onOpenChange(!open)
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, onOpenChange])

    function go(href: string) {
        onOpenChange(false)
        router.push(href)
    }

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput placeholder="Go to a surface…" />
            <CommandList>
                <CommandEmpty>Nothing matches that.</CommandEmpty>

                <CommandGroup heading="Overview">
                    <CommandItem
                        value={OVERVIEW.label}
                        onSelect={() => go(OVERVIEW.href)}
                        className="text-xs"
                    >
                        <OVERVIEW.icon aria-hidden className="size-3.5" />
                        {OVERVIEW.label}
                    </CommandItem>
                </CommandGroup>

                {NAVIGATION.map((domain) => (
                    <CommandGroup key={domain.id} heading={domain.label}>
                        {domain.surfaces.map((surface) => (
                            <CommandItem
                                key={surface.href}
                                /*
                                 * The domain is part of the search value so typing "inventory"
                                 * finds "Stock levels" — an operator looks for the area before
                                 * they remember the screen's name.
                                 */
                                value={`${domain.label} ${surface.label}`}
                                onSelect={() => go(surface.href)}
                                className="text-xs"
                            >
                                <surface.icon aria-hidden className="size-3.5" />
                                {surface.label}
                                <CommandShortcut>{surface.href.replace("/admin", "")}</CommandShortcut>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                ))}
            </CommandList>
        </CommandDialog>
    )
}
