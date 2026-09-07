"use client"

import { useRouter } from "next/navigation"
import { LogOut, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/status-badge"
import { signOut, useSession } from "@/lib/auth-client"

/**
 * Identity and session, in the top bar's trailing slot.
 *
 * Folds in the theme control, which used to be a free-floating icon button in the root
 * layout with no owner and no surrounding chrome. Theme is a per-person preference, so it
 * belongs with the person, not beside the content.
 *
 * The role is rendered through StatusBadge rather than as plain text: SUPER_ADMIN can create
 * and demote other administrators, and knowing which of the two you are signed in as before
 * you act is exactly the "what state is it in" question of §1.4.
 */
export function AccountMenu() {
    const router = useRouter()
    const { data: session } = useSession()
    const { theme, setTheme } = useTheme()

    const user = session?.user as { name?: string; email?: string; role?: string } | undefined
    const label = user?.name || user?.email || ""
    const initial = label.trim().charAt(0).toUpperCase() || "?"

    if (!session?.user) {
        // A fixed-size placeholder, so the bar does not reflow when the session resolves.
        return <div aria-hidden className="size-7 shrink-0 rounded-md border bg-muted" />
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label="Account menu"
                    className="grid size-7 shrink-0 place-items-center rounded-md border border-border-strong bg-background text-xs font-medium transition-colors duration-(--duration-fast) hover:bg-accent"
                >
                    {initial}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={6} className="w-60">
                <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-medium">{label}</p>
                    {user?.email && label !== user.email && (
                        <p className="truncate text-2xs text-muted-foreground">{user.email}</p>
                    )}
                    <div className="mt-1.5">
                        <StatusBadge kind="role" value={user?.role ?? "ADMIN"} />
                    </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Appearance
                </DropdownMenuLabel>
                {/*
                  * No `mounted` guard, and no effect to set one. Radix does not render menu
                  * content until the menu is opened, which is always after hydration — so
                  * `theme` is already resolved by the time this exists in the DOM, and the
                  * mismatch the guard defends against cannot occur here.
                  */}
                <DropdownMenuRadioGroup value={theme} onValueChange={(next) => setTheme(next)}>
                    <DropdownMenuRadioItem value="light" className="text-xs">
                        <Sun aria-hidden className="mr-2 size-3.5" />
                        Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark" className="text-xs">
                        <Moon aria-hidden className="mr-2 size-3.5" />
                        Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system" className="text-xs">
                        <Monitor aria-hidden className="mr-2 size-3.5" />
                        System
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="cursor-pointer text-xs"
                    onSelect={async () => {
                        await signOut()
                        router.push("/sign-in")
                        router.refresh()
                    }}
                >
                    <LogOut aria-hidden className="mr-2 size-3.5" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
