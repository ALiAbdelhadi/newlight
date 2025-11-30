"use client"

import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

export function CTASection() {
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
                },
            })

            tl.to(headingRef.current, {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
            })
                .to(
                    descriptionRef.current,
                    {
                        opacity: 1,
                        y: 0,
                        duration: 1,
                        ease: "power3.out",
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
                    },
                    0.4,
                )
        })

        return () => ctx.revert()
    }, [])

    return (
        <section
            ref={sectionRef}
            className="min-h-screen bg-background text-foreground flex items-center justify-center lg:py-16 py-12"
        >
            <div ref={contentRef} className="text-center">
                <h2 ref={headingRef} className="text-5xl md:text-7xl font-light tracking-tighter mb-6 text-balance">
                    Ready to Illuminate Your Space?
                </h2>
                <p
                    ref={descriptionRef}
                    className="text-lg md:text-xl font-light text-muted-foreground tracking-wide mb-8 text-balance"
                >
                    Discover our curated collection of premium residential and commercial lighting solutions
                </p>
                <Link
                    ref={buttonRef}
                    href="/products"
                    className="inline-block px-8 py-4 bg-primary text-primary-foreground font-light tracking-wider uppercase text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                    Shop Collection
                </Link>
            </div>
        </section>
    )
}
