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
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs"
import { LogIn, User, UserPlus } from "lucide-react"
import { useTranslations } from "next-intl"

export default function AuthSection() {
    const { isLoaded } = useUser()
    const t = useTranslations("auth-section")

    if (!isLoaded) {
        return <AuthSkeleton />
    }

    return (
        <div className="flex items-center gap-2 sm:gap-4 rtl:flex-row-reverse" suppressHydrationWarning>
            <div className="hidden lg:flex items-center gap-6 rtl:flex-row-reverse">
                <SignedOut>
                    <DesktopAuthButtons t={t} />
                </SignedOut>
                <SignedIn>
                    <UserAvatar />
                </SignedIn>
                <CartSidebar />
            </div>
            <div className="flex lg:hidden items-center w-full gap-2 rtl:flex-row-reverse">
                <SignedOut>
                    <MobileAuthButtons t={t} />
                </SignedOut>
                <SignedIn>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <UserAvatar isMobile />
                        <CartSidebar />
                    </div>
                </SignedIn>
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
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="gap-4 font-medium bg-transparent">
                    <User className="w-5 h-5" />
                    <span className="sr-only">{t("account", { defaultMessage: "Account" })}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" sideOffset={8}>
                <SignInButton>
                    <DropdownMenuItem className="cursor-pointer">
                        <LogIn className="w-4 h-4 rtl:ml-2 rtl:mr-0 mr-2" />
                        <span>{t("signIn", { defaultMessage: "Sign In" })}</span>
                    </DropdownMenuItem>
                </SignInButton>
                <DropdownMenuSeparator />
                <SignUpButton>
                    <DropdownMenuItem className="cursor-pointer">
                        <UserPlus className="w-4 h-4 rtl:ml-2 rtl:mr-0 mr-2" />
                        <span>{t("signUp", { defaultMessage: "Sign Up" })}</span>
                    </DropdownMenuItem>
                </SignUpButton>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function MobileAuthButtons({ t }: AuthProps) {
    return (
        <div className="flex items-center gap-2 flex-1">
            <SignInButton>
                <Button variant="outline" size="sm" className="flex-1 font-medium bg-transparent">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden xs:inline">{t("signIn", { defaultMessage: "Sign In" })}</span>
                </Button>
            </SignInButton>
            <SignUpButton>
                <Button size="sm" className="flex-1 font-medium">
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden xs:inline">{t("signUp", { defaultMessage: "Sign Up" })}</span>
                </Button>
            </SignUpButton>
        </div>
    )
}

interface UserAvatarProps {
    isMobile?: boolean
}

function UserAvatar({ isMobile = false }: UserAvatarProps) {
    return (
        <UserButton
            afterSignOutUrl="/"
            appearance={{
                elements: {
                    avatarBox: `${isMobile ? "w-9 h-9" : "w-10 h-10"} transition-opacity hover:opacity-80`,
                    userButtonPopoverCard: "border border-border",
                    userButtonPopoverFooter: "hidden",
                },
                variables: {
                    fontSize: isMobile ? "13px" : "14px",
                    borderRadius: "0.5rem",
                },
            }}
        />
    )
}