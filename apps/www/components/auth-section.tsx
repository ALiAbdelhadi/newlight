"use client"

import { CartSidebar } from "@/components/cart-sidebar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useLocale } from "next-intl"
import { signOut, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { LogIn, LogOut, User, UserPlus } from "lucide-react"
import { useTranslations } from "next-intl"

export default function AuthSection() {
    // Clerk's <SignedIn>/<SignedOut> did this branch declaratively; Better Auth exposes the
    // session as data, so the branch is explicit. `isPending` is the same idea as isLoaded:
    // render the skeleton rather than flashing "Sign in" at someone who is already signed in.
    const { data: session, isPending } = useSession()
    const t = useTranslations("auth-section")
    const signedIn = Boolean(session?.user)

    /**
     * The server has no session, so it always renders the skeleton. The client must render the
     * skeleton too on its FIRST pass, or the two trees disagree and React throws
     * "Hydration failed because the server rendered HTML didn't match the client".
     *
     * This only started happening once `/api/auth/get-session` stopped answering 404 (A84):
     * with the endpoint broken the session never resolved, both sides rendered the skeleton,
     * and the mismatch was hidden behind the bug. Fixing authentication is what exposed it.
     *
     * `suppressHydrationWarning` on the wrapper below does not cover this — it applies to one
     * element's own attributes, not to a subtree that renders different elements.
     */
    // `useSyncExternalStore` rather than a mounted flag set in an effect: it answers "server
    // or client" by construction, with no state write during render and nothing for the React
    // compiler to object to. The store never changes, so it never re-subscribes.
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    )

    if (!mounted || isPending) {
        return <AuthSkeleton />
    }

    return (
        <div className="flex items-center gap-2 sm:gap-4 rtl:flex-row-reverse" suppressHydrationWarning>
            <div className="hidden lg:flex items-center gap-6 rtl:flex-row-reverse">
                {signedIn ? <UserAvatar /> : <DesktopAuthButtons t={t} />}
                <CartSidebar />
            </div>
            <div className="flex lg:hidden items-center w-full gap-2 rtl:flex-row-reverse">
                {signedIn ? (
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <UserAvatar isMobile />
                        <CartSidebar />
                    </div>
                ) : (
                    <MobileAuthButtons t={t} />
                )}
            </div>
        </div>
    )
}

function AuthSkeleton() {
    return (
        <div className="flex items-center gap-3">
            <div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-20 bg-muted rounded-md animate-pulse" />
        </div>
    )
}

interface AuthProps {
    t: ReturnType<typeof useTranslations>
}

function DesktopAuthButtons({ t }: AuthProps) {
    const locale = useLocale()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="gap-4 font-medium bg-transparent">
                    <User className="w-5 h-5" />
                    <span className="sr-only">{t("account", { defaultMessage: "Account" })}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" sideOffset={8}>
                <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={`/${locale}/sign-in`}>
                        <LogIn className="w-4 h-4 rtl:ml-2 rtl:mr-0 mr-2" />
                        <span>{t("signIn", { defaultMessage: "Sign In" })}</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={`/${locale}/sign-up`}>
                        <UserPlus className="w-4 h-4 rtl:ml-2 rtl:mr-0 mr-2" />
                        <span>{t("signUp", { defaultMessage: "Sign Up" })}</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function MobileAuthButtons({ t }: AuthProps) {
    const locale = useLocale()
    return (
        <div className="flex items-center gap-2 flex-1">
            <Button asChild variant="outline" size="sm" className="flex-1 font-medium bg-transparent">
                <Link href={`/${locale}/sign-in`}>
                    <LogIn className="w-4 h-4" />
                    <span className="hidden xs:inline">{t("signIn", { defaultMessage: "Sign In" })}</span>
                </Link>
            </Button>
            <Button asChild size="sm" className="flex-1 font-medium">
                <Link href={`/${locale}/sign-up`}>
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden xs:inline">{t("signUp", { defaultMessage: "Sign Up" })}</span>
                </Link>
            </Button>
        </div>
    )
}

interface UserAvatarProps {
    isMobile?: boolean
}

function UserAvatar({ isMobile = false }: UserAvatarProps) {
    const t = useTranslations("auth-section")
    const locale = useLocale()
    const router = useRouter()
    const { data: session } = useSession()
    const label = session?.user?.name || session?.user?.email || ""
    const initial = label.trim().charAt(0).toUpperCase() || "?"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label={t("userMenu", { defaultMessage: "User menu" })}
                    className={`${isMobile ? "w-9 h-9 text-[13px]" : "w-10 h-10 text-sm"} flex items-center justify-center rounded-lg border border-border bg-secondary font-medium transition-opacity hover:opacity-80`}
                >
                    {initial}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{label}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={`/${locale}/orders`}>
                        <User className="w-4 h-4 rtl:ml-2 rtl:mr-0 mr-2" />
                        <span>{t("dashboard", { defaultMessage: "Dashboard" })}</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={async () => {
                        await signOut()
                        // refresh(), not just push(): server components cache the signed-in
                        // render, and without it the header keeps showing the old session.
                        router.push(`/${locale}`)
                        router.refresh()
                    }}
                >
                    <LogOut className="w-4 h-4 rtl:ml-2 rtl:mr-0 mr-2" />
                    <span>{t("signOut", { defaultMessage: "Sign out" })}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
