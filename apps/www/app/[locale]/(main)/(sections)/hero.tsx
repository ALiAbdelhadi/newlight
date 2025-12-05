"use client"

import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from 'next-intl'
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
        <div className="h-[60%] text-foreground pb-72 md:pb-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-130">
                <div ref={heroImageRef} className="lg:col-span-7 relative overflow-hidden h-96 md:h-auto">
                    <div
                        className="bg-image absolute inset-0 bg-cover bg-center before:absolute before:inset-0 before:bg-linear-to-r before:from-black/40 before:to-transparent before:z-10"
                        style={{
                            backgroundImage: "url('/hero/hero.jpg')",
                        }}
                    />
                    <div ref={heroTextRef} className="relative z-20 h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-4 italic text-white">{t('illuminate')}</h1>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-light tracking-wider uppercase text-white/70">
                            {t('inspirationGlow')}
                        </p>
                    </div>
                </div>
                <div className="lg:col-span-5 grid grid-rows-2 gap-0">
                    <div
                        ref={inspirationRef}
                        className="relative bg-card flex items-center justify-center p-12 border-b border-border"
                    >
                        <div className="text-center">
                            <h2 className="text-5xl lg:text-6xl font-light mb-2 text-card-foreground">{t('inspiration')}</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-0">
                        <div
                            ref={technicalLinksRef}
                            className="bg-muted p-8 flex flex-col justify-center border-r border-border"
                        >
                            <div>
                                <Link href="/technical-resources" className="block mb-8">
                                    <p className="text-lg font-light mb-2 text-foreground">
                                        {t('technicalResources').split(' ').map((word, index) => (
                                            <span key={index}>{word} <br /></span>
                                        ))}
                                    </p>
                                    <div className="h-px w-12 bg-black" />
                                </Link>
                                <Link href="/about" className="block">
                                    <p className="text-lg font-light text-foreground mb-2">
                                        <span>{t('weAre')}</span>
                                        <br />
                                        <span>{t('weAreNewLight')}</span>
                                    </p>
                                    <div className="h-px w-12 bg-black" />
                                </Link>
                            </div>
                        </div>
                        <div
                            ref={productsRef}
                            className="relative overflow-hidden"
                        >
                            <div
                                className="absolute inset-0 bg-cover bg-center before:absolute before:inset-0 before:bg-linear-to-t before:from-black/60 before:to-transparent before:z-10"
                                style={{
                                    backgroundImage: "url('https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000')",
                                }}
                            />
                            <div className="relative z-20 h-full flex items-end p-8">
                                <Link
                                    href="category"
                                    className="text-3xl md:text-4xl lg:text-5xl font-light text-primary-foreground transition-all duration-300 hover:tracking-wider"
                                >
                                    {t('products')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}