"use client"

import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from 'next-intl'
import Image from "next/image"
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
    const t = useTranslations('hero-section');

    const heroImageRef = useRef<HTMLDivElement>(null)
    const heroTextRef = useRef<HTMLDivElement>(null)
    const inspirationRef = useRef<HTMLDivElement>(null)
    const technicalLinksRef = useRef<HTMLDivElement>(null)
    const productsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.set([heroTextRef.current, heroImageRef.current], {
                opacity: 0,
            })
            gsap.set(inspirationRef.current, {
                opacity: 0,
                x: -60
            })
            gsap.set(technicalLinksRef.current, {
                opacity: 0,
                y: -60
            })
            gsap.set(productsRef.current, {
                opacity: 0,
                x: -60
            })

            const masterTl = gsap.timeline({
                defaults: {
                    ease: 'power4.out'
                }
            })

            masterTl.fromTo(
                heroImageRef.current,
                { opacity: 0, scale: 1.05 },
                { opacity: 1, scale: 1, duration: 1.6 },
                0
            )

            masterTl.fromTo(
                heroTextRef.current,
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 1.4 },
                0.3
            )

            masterTl.to(inspirationRef.current, {
                opacity: 1,
                x: 0,
                duration: 1.2,
                ease: 'power3.out'
            }, 0.8)

            masterTl.to(technicalLinksRef.current, {
                opacity: 1,
                y: 0,
                duration: 1.2,
                ease: 'power3.out'
            }, 0.95)

            masterTl.to(productsRef.current, {
                opacity: 1,
                x: 0,
                duration: 1.2,
                ease: 'power3.out'
            }, 0.95)

            if (heroImageRef.current) {
                const bgImage = heroImageRef.current.querySelector(".bg-image") as HTMLElement

                gsap.to(bgImage, {
                    scrollTrigger: {
                        trigger: heroImageRef.current,
                        start: 'top top',
                        end: 'bottom top',
                        scrub: 1.2,
                    },
                    y: 150,
                    scale: 1.1,
                    ease: 'none'
                })
            }

            const links = document.querySelectorAll('a')
            links.forEach((link) => {
                const underline = link.querySelector('.h-px')
                if (!underline) return

                const handleLinkEnter = () => {
                    gsap.to(underline, {
                        width: '3rem',
                        duration: 0.5,
                        ease: 'power2.out'
                    })
                }
                const handleLinkLeave = () => {
                    gsap.to(underline, {
                        width: '3rem',
                        duration: 0.5,
                        ease: 'power2.out'
                    })
                }

                link.addEventListener('mouseenter', handleLinkEnter)
                link.addEventListener('mouseleave', handleLinkLeave)

                return () => {
                    link.removeEventListener('mouseenter', handleLinkEnter)
                    link.removeEventListener('mouseleave', handleLinkLeave)
                }
            })
        })
        return () => ctx.revert()
    }, [t])

    return (
        <div className="relative min-h-[80vh] flex flex-col lg:flex-row  border-b border-border/50">
            {/* Main Visual Side */}
            <div ref={heroImageRef} className="relative flex-1 lg:flex-7 min-h-[40vh] lg:min-h-0 overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-r from-background/60 via-background/20 to-transparent z-10" />
                
                <Image
                    src="/hero/hero.jpg"
                    alt={t('illuminate')}
                    fill
                    priority
                    className="bg-image object-cover object-center transition-transform duration-1000 ease-out will-change-transform"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                />
                
                <div ref={heroTextRef} className="relative z-20 h-full flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-24">
                    <div className="space-y-4 max-w-2xl">
                        <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl italic text-foreground tracking-tight leading-[0.9]">
                            {t('illuminate')}
                        </h1>
                        <p className="text-sm md:text-base font-sans font-medium tracking-[0.3em] uppercase text-muted-foreground">
                            {t('inspirationGlow')}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex-1 lg:flex-[5] flex flex-col bg-card">
                <div
                    ref={inspirationRef}
                    className="flex-1 flex items-center justify-center p-12 lg:p-20 border-b border-border/50 group cursor-default"
                >
                    <div className="text-center space-y-4">
                        <h2 className="text-5xl lg:text-7xl font-serif italic text-foreground leading-tight">
                            {t('inspiration')}
                        </h2>
                        <div className="h-px w-12 bg-primary mx-auto transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    </div>
                </div>

                <div className="grid grid-cols-2 flex-1">
                    <div
                        ref={technicalLinksRef}
                        className="p-8 lg:p-12 flex flex-col justify-center border-r border-border/50 hover:bg-muted/30 transition-colors duration-500"
                    >
                        <div className="space-y-8">
                            <Link href="/technical-resources" className="block group">
                                <p className="text-base font-medium tracking-wider mb-2 text-foreground group-hover:text-primary transition-colors">
                                    {t('technicalResources').split(' ').map((word, index) => (
                                        <span key={index} className="block">{word}</span>
                                    ))}
                                </p>
                                <div className="h-px w-8 bg-border group-hover:w-full transition-all duration-500" />
                            </Link>
                            <Link href="/about" className="block group">
                                <p className="text-base font-medium tracking-wider text-foreground group-hover:text-primary transition-colors mb-2">
                                    <span>{t('weAre')}</span>
                                    <span className="block italic font-serif lowercase">{t('weAreNewLight')}</span>
                                </p>
                                <div className="h-px w-8 bg-border group-hover:w-full transition-all duration-500" />
                            </Link>
                        </div>
                    </div>

                    <div
                        ref={productsRef}
                        className="relative overflow-hidden group cursor-pointer"
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                            style={{
                                backgroundImage: "url('https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000')",
                            }}
                        />
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                        <div className="relative z-20 h-full flex items-end p-8 lg:p-12">
                            <Link
                                href="category"
                                className="text-2xl lg:text-3xl font-serif italic text-white transition-all duration-300 group-hover:translate-x-2"
                            >
                                {t('category')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}