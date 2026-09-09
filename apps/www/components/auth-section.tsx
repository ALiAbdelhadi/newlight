"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut, useSession } from "@/lib/auth-client"
import { LogIn, LogOut, Package, ShoppingBag, User, UserPlus } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSyncExternalStore } from "react"

export default function AuthSection() {
    const { data: session, isPending } = useSession()
    const t = useTranslations("auth-section")
    const signedIn = Boolean(session?.user)

    const mounted = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false
    )

    if (!mounted || isPending) {
        return <AuthSkeleton />
    }

    return (
        <div suppressHydrationWarning>
            {signedIn ? <UserAvatar /> : <AccountMenu t={t} />}
        </div>
    )
}

function AuthSkeleton() {
    return (
        <div
            aria-hidden
            className="size-10 animate-pulse rounded-full bg-secondary/80"
        />
    )
}

interface AuthProps {
    t: ReturnType<typeof useTranslations>
}

function AccountMenu({ t }: AuthProps) {
    const locale = useLocale()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label={t("account", { defaultMessage: "Account" })}
                    className="grid size-10 place-items-center rounded-full transition-colors duration-300 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <User aria-hidden className="size-5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1" sideOffset={8}>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 transition-colors">
                    <Link href={`/${locale}/sign-in`} className="flex items-center group">
                        <LogIn className="size-4 me-2.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                        <span className="font-medium">{t("signIn", { defaultMessage: "Sign In" })}</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 transition-colors">
                    <Link href={`/${locale}/sign-up`} className="flex items-center group">
                        <UserPlus className="size-4 me-2.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                        <span className="font-medium">{t("signUp", { defaultMessage: "Sign Up" })}</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function UserAvatar() {
    const t = useTranslations("auth-section")
    const locale = useLocale()
    const router = useRouter()
    const { data: session } = useSession()

    const label = session?.user?.name || session?.user?.email || ""
    const initial = label.trim().charAt(0).toUpperCase() || "?"

    const handleSignOut = async () => {
        await signOut()
        router.push(`/${locale}`)
        router.refresh()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label={t("userMenu", { defaultMessage: "User menu" })}
                    className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary transition-all duration-300 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {initial}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl p-1 shadow-xl" sideOffset={8}>
                <div className="px-3 py-2.5">
                    <p className="text-sm font-medium text-foreground truncate">{label}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{session?.user?.email}</p>
                </div>
                <DropdownMenuSeparator className="my-1" />
                <div className="px-1 space-y-0.5">
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
                        <Link href={`/${locale}/account`} className="flex items-center group">
                            <User className="size-4 me-2.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                            <span className="font-medium">{t("myAccount")}</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
                        <Link href={`/${locale}/cart`} className="flex items-center group">
                            <ShoppingBag className="size-4 me-2.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                            <span className="font-medium">{t("cart")}</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
                        <Link href={`/${locale}/orders`} className="flex items-center group">
                            <Package className="size-4 me-2.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                            <span className="font-medium">{t("myOrders", { defaultMessage: "My orders" })}</span>
                        </Link>
                    </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="my-1" />
                <div className="px-1">
                    <DropdownMenuItem
                        className="cursor-pointer rounded-lg py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onSelect={handleSignOut}
                    >
                        <LogOut className="size-4 me-2.5 opacity-80" />
                        <span className="font-medium">{t("signOut", { defaultMessage: "Sign out" })}</span>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}