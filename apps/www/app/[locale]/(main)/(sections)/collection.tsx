"use client"

import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

export function Collection() {
    const t = useTranslations('collection-section');

    const sectionRef = useRef<HTMLDivElement>(null)
    const image1Ref = useRef<HTMLDivElement>(null)
    const image2Ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            if (image1Ref.current) {
                gsap.fromTo(
                    image1Ref.current.querySelector('img'),
                    { scale: 1.2 },
                    {
                        scale: 1,
                        duration: 1.5,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: image1Ref.current,
                            start: "top bottom",
                            scrub: true,
                        },
                    }
                )
            }

            if (image2Ref.current) {
                gsap.fromTo(
                    image2Ref.current.querySelector('img'),
                    { scale: 1.2 },
                    {
                        scale: 1,
                        duration: 1.5,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: image2Ref.current,
                            start: "top bottom",
                            scrub: true,
                        },
                    }
                )
            }
        })

        return () => ctx.revert()
    }, [])

    return (
        <section ref={sectionRef} className="py-24 lg:py-40 overflow-hidden">
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                    <div className="space-y-12 lg:space-y-24 order-2 lg:order-1">
                        <div className="group relative aspect-[4/5] overflow-hidden" ref={image1Ref}>
                            <Image
                                src="/new-collection/new-collection-1/new-collection-1.png"
                                alt="Collection 1"
                                fill
                                className="object-cover transition-transform duration-700 ease-out"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-700" />
                            <div className="absolute bottom-10 left-10 text-white z-10 transition-transform duration-500 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                                <h3 className="text-3xl font-serif italic">{t('image1Title')}</h3>
                                <p className="text-xs uppercase tracking-[0.2em] font-light mt-2">{t('image1Category')}</p>
                            </div>
                        </div>

                        <div className="max-w-md space-y-6">
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif italic text-foreground leading-tight">
                                {t('timeless-eleganceTitle')}
                            </h2>
                            <p className="text-muted-foreground text-base md:text-lg font-light leading-relaxed tracking-wide">
                                {t('timeless-eleganceDescription')}
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/new-collection"
                                    className="inline-flex items-center gap-2 text-foreground text-sm font-medium tracking-[0.2em] uppercase group"
                                >
                                    {t('timeless-eleganceAction')}
                                    <div className="h-px w-8 bg-foreground group-hover:w-12 group-hover:bg-primary transition-all duration-500" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12 order-1 lg:order-2">
                        <div className="group relative aspect-[4/3] overflow-hidden" ref={image2Ref}>
                            <Image
                                src="/new-collection/new-collection-2/new-collection-2.png"
                                alt="Collection 2"
                                fill
                                className="object-cover transition-transform duration-700 ease-out"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-700" />
                        </div>
                        <div className="mt-8 space-y-4 max-w-lg">
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif italic text-foreground leading-tight">
                                {t('premium-finishesTitle')}
                            </h2>
                            <p className="text-muted-foreground text-base md:text-lg font-light leading-relaxed tracking-wide">
                                {t('premium-finishesDescription')}
                            </p>
                            <div className="pt-4">
                                <span className="inline-flex items-center gap-2 text-foreground text-sm font-medium tracking-[0.2em] uppercase cursor-pointer group-hover:text-primary transition-colors">
                                    {t('premium-finishesAction')}
                                    <div className="h-px w-8 bg-foreground group-hover:bg-primary group-hover:w-12 transition-all duration-500" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-32 lg:mt-48 text-center relative z-10">
                    <Link
                        href="/new-collection"
                        className="group relative inline-flex items-center gap-4 px-10 py-5 bg-foreground text-background overflow-hidden transition-all duration-500 hover:shadow-premium"
                    >
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                        <span className="relative z-10 text-xs font-bold uppercase tracking-[0.3em]">{t('buttonText')}</span>
                        <div className="relative z-10 w-4 h-4 rtl:rotate-180">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                </div>
            </Container>
        </section>
    );
};