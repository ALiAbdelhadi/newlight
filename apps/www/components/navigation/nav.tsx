"use client"

import { Container } from "@/components/container"
import { LanguageSelector } from "@/components/language-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { Link } from "@/i18n/navigation"
import { MapPin, Menu, X } from "lucide-react"
import AuthSection from "../auth-section"
import { SearchSheet } from "../search"
import { AuthSectionWrapper } from "./auth-section-wrapper"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollArea } from "../ui/scroll-area"

export function Nav() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const navRef = useRef<HTMLElement>(null)
    const logoRef = useRef<HTMLAnchorElement>(null)
    const navItemsRef = useRef<HTMLElement>(null)
    const mobileMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        if (!logoRef.current || !navItemsRef.current) return

        const ctx = gsap.context(() => {
            gsap.set(logoRef.current, { opacity: 0, y: -10 })

            const navChildren = navItemsRef.current?.children
            if (navChildren && navChildren.length > 0) {
                gsap.set(Array.from(navChildren), { opacity: 0, y: -10 })
            }

            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

            tl.to(logoRef.current, {
                opacity: 1,
                y: 0,
                duration: 0.6,
            })

            if (navChildren && navChildren.length > 0) {
                tl.to(
                    Array.from(navChildren),
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        stagger: 0.05,
                    },
                    "-=0.4"
                )
            }
        })

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        if (!mobileMenuRef.current) return

        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden"
            gsap.fromTo(
                mobileMenuRef.current,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
            )

            const items = mobileMenuRef.current.querySelectorAll('.mobile-menu-item')
            if (items.length > 0) {
                gsap.fromTo(
                    Array.from(items),
                    { opacity: 0, x: -20 },
                    { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" }
                )
            }
        } else {
            document.body.style.overflow = "unset"
        }

        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    return (
        <>
            <header
                ref={navRef}
                className={`fixed top-0 z-50 w-full transition-all duration-500 ${isScrolled
                    ? "bg-background/80 backdrop-blur-xl shadow-sm"
                    : "bg-transparent"
                    }`}
            >
                <Container>
                    <div className="flex h-16 items-center justify-center">
                        <div className="flex w-full items-center justify-between gap-8">
                            <Link
                                ref={logoRef}
                                href="/"
                                className="flex items-baseline gap-1 group relative z-50"
                            >
                                <h1 className="text-2xl font-extrabold tracking-tighter uppercase text-foreground transition-all duration-300 group-hover:tracking-tight">
                                    new
                                </h1>
                                <p className="text-2xl font-light tracking-widest uppercase text-foreground/90 transition-all duration-300 group-hover:tracking-wider">
                                    light
                                </p>
                            </Link>
                            <nav ref={navItemsRef} className="hidden lg:flex items-center gap-2 text-sm">
                                <NavItem>
                                    <LanguageSelector />
                                </NavItem>
                                <NavDivider />
                                <NavItem>
                                    <ThemeToggle />
                                </NavItem>
                                <NavItem>
                                    <SearchSheet />
                                </NavItem>
                                <NavItem>
                                    <Link
                                        href="/contact"
                                        className="group rounded-lg p-2.5 transition-all duration-300 hover:bg-muted/80 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-linear-to-r from-muted/0 via-muted/50 to-muted/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <MapPin className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                                        <span className="sr-only">Contact</span>
                                    </Link>
                                </NavItem>
                                <NavDivider />
                                <NavItem>
                                    <AuthSectionWrapper>
                                        <AuthSection />
                                    </AuthSectionWrapper>
                                </NavItem>
                            </nav>
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="z-50 lg:hidden group rounded-lg p-2.5 transition-all duration-300 hover:bg-muted/80 relative overflow-hidden"
                                aria-label="Toggle mobile menu"
                            >
                                <div className="absolute inset-0 bg-linear-to-r from-muted/0 via-muted/50 to-muted/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                {isMobileMenuOpen ? (
                                    <X className="h-6 w-6 relative z-50 transition-transform duration-300 group-hover:rotate-90" />
                                ) : (
                                    <Menu className="h-6 w-6 relative z-50 transition-transform duration-300 group-hover:scale-110" />
                                )}
                            </button>
                        </div>
                    </div>
                </Container>
            </header>
            {isMobileMenuOpen && (
                <div
                    ref={mobileMenuRef}
                    className="fixed inset-0 z-40 lg:hidden bg-background/98 backdrop-blur-2xl"
                    style={{ top: "64px" }}
                >
                    <Container className="h-full">
                        <ScrollArea className="h-[calc(100vh-64px)] w-full">
                            <div className="py-8 px-2">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <MobileMenuItem>
                                            <Link
                                                href="/"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-2xl font-light tracking-wide text-foreground hover:text-foreground/70 transition-colors py-2"
                                            >
                                                Home
                                            </Link>
                                        </MobileMenuItem>
                                        <MobileMenuItem>
                                            <Link
                                                href="/category"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-2xl font-light tracking-wide text-foreground hover:text-foreground/70 transition-colors py-2"
                                            >
                                                Products
                                            </Link>
                                        </MobileMenuItem>
                                        <MobileMenuItem>
                                            <Link
                                                href="/about"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-2xl font-light tracking-wide text-foreground hover:text-foreground/70 transition-colors py-2"
                                            >
                                                About
                                            </Link>
                                        </MobileMenuItem>
                                        <MobileMenuItem>
                                            <Link
                                                href="/contact"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-2xl font-light tracking-wide text-foreground hover:text-foreground/70 transition-colors py-2"
                                            >
                                                Contact
                                            </Link>
                                        </MobileMenuItem>
                                    </div>
                                    <div className="h-px w-full bg-border/30" />
                                    <div className="space-y-4">
                                        <MobileMenuItem>
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                                                    Language
                                                </span>
                                                <LanguageSelector />
                                            </div>
                                        </MobileMenuItem>
                                        <MobileMenuItem>
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                                                    Theme
                                                </span>
                                                <ThemeToggle />
                                            </div>
                                        </MobileMenuItem>
                                        <MobileMenuItem>
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                                                    Search
                                                </span>
                                                <SearchSheet />
                                            </div>
                                        </MobileMenuItem>
                                    </div>
                                    <div className="h-px w-full bg-border/30" />
                                    <MobileMenuItem>
                                        <div className="pt-4">
                                            <AuthSectionWrapper>
                                                <AuthSection />
                                            </AuthSectionWrapper>
                                        </div>
                                    </MobileMenuItem>
                                </div>
                                <div className="mt-12 pt-8 border-t border-border/30">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-light text-center">
                                        The New Thesaurus: Premium Lighting Solutions
                                    </p>
                                </div>
                            </div>
                        </ScrollArea>
                    </Container>
                </div>
            )}
        </>
    )
}

function NavItem({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center">{children}</div>
}

function NavDivider() {
    return <div className="h-5 w-px bg-border/40 mx-1" />
}

function MobileMenuItem({ children }: { children: React.ReactNode }) {
    return <div className="mobile-menu-item">{children}</div>
}