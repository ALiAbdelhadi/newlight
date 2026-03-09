"use client"

import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

export function CTASection() {
    const t = useTranslations('cta-section');

    const sectionRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const descriptionRef = useRef<HTMLParagraphElement>(null)
    const buttonRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.set([headingRef.current, descriptionRef.current, buttonRef.current], {
                opacity: 0,
                y: 40,
                
            })

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top center",
                    end: "top 30%",
                    scrub: 1,
                    once: true
                },
            })

            tl.to(headingRef.current, {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
                once: true
            })
                .to(
                    descriptionRef.current,
                    {
                        opacity: 1,
                        y: 0,
                        duration: 1,
                        ease: "power3.out",
                        once: true
                    },
                    0.2,
                )
                .to(
                    buttonRef.current,
                    {
                        opacity: 1,
                        y: 0,
                        duration: 1,
                        ease: "power3.out",
                        once: true
                    },
                    0.4,
                )
        })

        return () => ctx.revert()
    }, [])

    return (
        <section
            ref={sectionRef}
            className="py-24 lg:py-40 bg-card/30 relative overflow-hidden"
        >
            {/* Background Accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <Container className="relative z-10">
                <div ref={contentRef} className="max-w-4xl mx-auto text-center space-y-10">
                    <div className="space-y-6">
                        <h2 ref={headingRef} className="text-6xl md:text-8xl lg:text-9xl font-serif italic tracking-tighter text-foreground text-balance leading-[0.85]">
                            {t('heading')}
                        </h2>
                        <div className="h-px w-24 bg-primary mx-auto opacity-50" />
                    </div>
                    
                    <p
                        ref={descriptionRef}
                        className="text-lg md:text-2xl font-light text-muted-foreground tracking-wide max-w-2xl mx-auto text-balance leading-relaxed"
                    >
                        {t('description')}
                    </p>
                    
                    <div className="pt-8">
                        <Link
                            ref={buttonRef}
                            href={t('buttonHref')}
                            className="group relative inline-flex items-center gap-4 px-12 py-6 bg-primary text-primary-foreground overflow-hidden transition-all duration-500 hover:shadow-premium"
                        >
                            <span className="relative z-10 text-xs font-bold uppercase tracking-[0.4em]">
                                {t('buttonText')}
                            </span>
                            <div className="relative z-10 w-5 h-5 rtl:rotate-180 transform group-hover:translate-x-1 transition-transform">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                            <div className="absolute inset-0 bg-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </Link>
                    </div>
                </div>
            </Container>
        </section>
    )
}