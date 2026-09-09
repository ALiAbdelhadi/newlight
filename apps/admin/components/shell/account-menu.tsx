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

export function AccountMenu() {
    const router = useRouter()
    const { data: session } = useSession()
    const { theme, setTheme } = useTheme()

    const user = session?.user as { name?: string; email?: string; role?: string } | undefined
    const label = user?.name || user?.email || ""
    const initial = label.trim().charAt(0).toUpperCase() || "?"

    if (!session?.user) {
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

                <DropdownMenuLabel className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
                    Appearance
                </DropdownMenuLabel>
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
