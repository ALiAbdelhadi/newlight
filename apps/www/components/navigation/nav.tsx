"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import AuthSection from "@/components/auth-section"
import { CartSidebar } from "@/components/cart-sidebar"
import { Container } from "@/components/layout/section"
import { LanguageSelector } from "@/components/language-selector"
import { SearchSheet } from "@/components/search"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Link } from "@/i18n/navigation"
import { usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { AuthSectionWrapper } from "./auth-section-wrapper"


interface NavLink {
    href: string
    label: string
}

/**
 * `hasOffers` comes from the layout, which already asked (§13.2). The Offers link appears only
 * while something is discounted: a permanent link to a page that says "nothing is on offer" is
 * a promise the catalogue keeps breaking, and it is one of the two or three links a customer
 * scans on every page.
 */
export function Nav({ hasOffers = false }: { hasOffers?: boolean }) {
    const t = useTranslations("nav")
    const isRTL = useLocale() === "ar"
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [lastPathname, setLastPathname] = useState(pathname)

    // Close the drawer once the route has actually changed. Derived during render rather than
    // in an effect — closing in the click handler closes it before the new page resolves.
    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        if (menuOpen) setMenuOpen(false)
    }

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 16)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    const links: NavLink[] = [
        { href: "/category", label: t("mobileMenuTitleProducts") },
        ...(hasOffers ? [{ href: "/offers", label: t("offersLink") }] : []),
        { href: "/technical-resources", label: t("technicalResources") },
        { href: "/about", label: t("mobileMenuTitleAbout") },
        { href: "/contact", label: t("mobileMenuTitleContact") },
    ]

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

    return (
        <header
            className={cn(
                /* `top` is the strip's height, which is 0px unless one is showing (§13.2).
                   Hardcoding `top-0` here would put the header over the announcement. */
                "fixed top-(--announcement-height) z-50 w-full transition-colors duration-(--duration-base)",
                /* Solid once it detaches from the top of the page, transparent over the hero.
                   The shadow is the only one on the site that is not an overlay, and it is what
                   §24 means by using elevation for a floating surface rather than everywhere. */
                scrolled
                    ? "border-b bg-background/85 shadow-overlay backdrop-blur-xl"
                    : "border-b border-transparent bg-transparent"
            )}
        >
            <Container>
                <div className="flex h-16 items-center gap-4">
                    {/*
                      * THE WORDMARK BREATHES ON HOVER, and that is deliberate — it is the
                      * storefront's oldest micro-interaction and the consolidation pass dropped
                      * it by accident.
                      *
                      * The two halves move TOWARDS each other: "NEW" is set tight and loosens
                      * (`tracking-tighter` → `tracking-tight`), "LIGHT" is set wide and closes
                      * (`tracking-wordmark` → `tracking-label`). The wordmark gathers itself
                      * rather than growing, so the header's layout does not shift under it.
                      * Restored from the pre-redesign implementation, retimed to the system's
                      * own `--duration-base` instead of a hardcoded 300ms.
                      */}
                    <Link href="/" className="group flex shrink-0 items-baseline gap-1">
                        <span className="text-xl font-extrabold tracking-tighter uppercase transition-[letter-spacing] duration-(--duration-base) ease-out-fast group-hover:tracking-tight">
                            {t("logoNew")}
                        </span>
                        <span className="text-xl font-light tracking-wordmark uppercase transition-[letter-spacing] duration-(--duration-base) ease-out-fast group-hover:tracking-label">
                            {t("logoLight")}
                        </span>
                        <span className="sr-only">NewLight</span>
                    </Link>

                    {/* The site's actual navigation, in words, on the screen size that has room
                        for words. */}
                    <nav aria-label={t("primaryNav")} className="hidden lg:flex lg:items-center lg:gap-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                className={cn(
                                    "rounded-md px-3 py-2 text-sm transition-colors duration-(--duration-fast)",
                                    isActive(link.href)
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ms-auto flex items-center gap-1">
                        <SearchSheet />
                        <div className="hidden sm:flex sm:items-center sm:gap-1">
                            <LanguageSelector />
                            <ThemeToggle />
                        </div>

                        <AuthSectionWrapper>
                            <AuthSection />
                        </AuthSectionWrapper>

                        {/* Always present, both breakpoints, both session states. */}
                        <CartSidebar />

                        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                            <SheetTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={t("openMenu")}
                                    className="grid size-10 place-items-center rounded-md transition-colors duration-(--duration-fast) hover:bg-accent lg:hidden"
                                >
                                    <Menu aria-hidden className="size-5" />
                                </button>
                            </SheetTrigger>

                            {/* The trigger sits at the row's inline-end — physical left in RTL,
                                right in LTR. The drawer has to unfurl from that same corner or it
                                reads as flying in from across the screen instead of opening out
                                of the button that was just pressed. */}
                            <SheetContent
                                side={isRTL ? "left" : "right"}
                                className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
                            >
                                <div className="flex h-16 items-center justify-between border-b px-5">
                                    <SheetTitle className="flex items-baseline gap-1 text-lg">
                                        <span className="font-extrabold tracking-tight uppercase">
                                            {t("logoNew")}
                                        </span>
                                        <span className="font-light tracking-label uppercase">
                                            {t("logoLight")}
                                        </span>
                                    </SheetTitle>

                                    {/* The panel is full-width on mobile (§ above), so it leaves no
                                        overlay showing to tap-outside-to-close. Without this, closing
                                        without picking a link meant the keyboard-only Escape key. */}
                                    <SheetClose
                                        aria-label={t("closeMenu")}
                                        className="-me-2.5 grid size-10 place-items-center rounded-md transition-colors duration-(--duration-fast) hover:bg-accent"
                                    >
                                        <X aria-hidden className="size-5" />
                                    </SheetClose>
                                </div>

                                <nav aria-label={t("primaryNav")} className="flex-1 overflow-y-auto p-5">
                                    <ul className="space-y-1">
                                        <li>
                                            <MobileLink href="/" active={pathname === "/"}>
                                                {t("mobileMenuTitleHome")}
                                            </MobileLink>
                                        </li>
                                        {links.map((link) => (
                                            <li key={link.href}>
                                                <MobileLink href={link.href} active={isActive(link.href)}>
                                                    {link.label}
                                                </MobileLink>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-6 space-y-3 border-t pt-6 sm:hidden">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                {t("mobileMenuLabelLanguage")}
                                            </span>
                                            <LanguageSelector />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                {t("mobileMenuLabelTheme")}
                                            </span>
                                            <ThemeToggle />
                                        </div>
                                    </div>
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </Container>
        </header>
    )
}

function MobileLink({
    href,
    active,
    children,
}: {
    href: string
    active: boolean
    children: React.ReactNode
}) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
                // 48px rows: this is the touch surface, and the desktop rail's 36px is not a
                // thumb target.
                "flex h-12 items-center rounded-md px-3 text-lg transition-colors duration-(--duration-fast)",
                active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60"
            )}
        >
            {children}
        </Link>
    )
}
