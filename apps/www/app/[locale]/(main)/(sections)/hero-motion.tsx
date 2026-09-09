"use client"

import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useEffect, useRef, type ReactNode } from "react"

gsap.registerPlugin(ScrollTrigger)

const TARGETS = "[data-hero-media], [data-hero-text], [data-hero-inspiration], [data-hero-links], [data-hero-tile]"

export function HeroMotion({ children }: { children: ReactNode }) {
    const scope = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const root = scope.current
        if (!root) return

        const ctx = gsap.context((self) => {
            const q = self.selector
            if (!q) return

            const media = q("[data-hero-media]")
            const image = q("[data-hero-image]")
            const text = q("[data-hero-text]")
            const inspiration = q("[data-hero-inspiration]")
            const links = q("[data-hero-links]")
            const tile = q("[data-hero-tile]")

            const mm = gsap.matchMedia()

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set(q(TARGETS), { opacity: 1, x: 0, y: 0, scale: 1 })
            })

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const isRtl = getComputedStyle(root).direction === "rtl" || document.dir === "rtl"
                const away = isRtl ? 40 : -40 

                const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
                if (media.length) {
                    tl.fromTo(media, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1.4 }, 0)
                }
                if (text.length) {
                    tl.fromTo(text, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2 }, 0.2)
                }
                if (inspiration.length) {
                    tl.fromTo(inspiration, { opacity: 0, x: away }, { opacity: 1, x: 0, duration: 1 }, 0.4)
                }
                if (links.length) {
                    tl.fromTo(links, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 0.5)
                }
                if (tile.length) {
                    tl.fromTo(tile, { opacity: 0, x: away }, { opacity: 1, x: 0, duration: 1 }, 0.5)
                }
                if (media.length && image.length) {
                    gsap.to(image, {
                        yPercent: 12,
                        scale: 1.1,
                        ease: "none",
                        scrollTrigger: {
                            trigger: media[0],
                            start: "top top",
                            end: "bottom top",
                            scrub: 1,
                            invalidateOnRefresh: true,
                        },
                    })
                }
            })
        }, scope)

        return () => ctx.revert()
    }, [])

    return (
        <div ref={scope} className="w-full relative">
            <noscript>
                <style>{`${TARGETS} { opacity: 1 !important; transform: none !important; }`}</style>
            </noscript>
            {children}
        </div>
    )
}