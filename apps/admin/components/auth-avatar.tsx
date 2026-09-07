"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut, useSession } from "@/lib/auth-client"

interface UserAvatarProps {
    isMobile?: boolean
}

/**
 * Replaces Clerk's <UserButton />. It also shows the ROLE, which the Clerk version could not:
 * there was no role, only nine comparisons against an ADMIN_EMAIL environment variable.
 */
export default function AuthAvatar({ isMobile = false }: UserAvatarProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const user = session?.user as (typeof session extends null ? never : { name?: string; email?: string; role?: string }) | undefined
    const label = user?.name || user?.email || ""
    const initial = label.trim().charAt(0).toUpperCase() || "?"

    if (!session?.user) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label="Account menu"
                    className={`${isMobile ? "h-9 w-9 text-[13px]" : "h-10 w-10 text-sm"} flex items-center justify-center rounded-lg border border-border bg-secondary font-medium transition-opacity hover:opacity-80`}
                >
                    {initial}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                <div className="px-2 py-1.5">
                    <p className="truncate text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{user?.role ?? "ADMIN"}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={async () => {
                        await signOut()
                        router.push("/sign-in")
                        router.refresh()
                    }}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
