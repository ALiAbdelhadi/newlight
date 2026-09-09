"use client"

import { useEffect, useRef } from "react"

export function RevealScope({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const root = ref.current
        if (!root) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const arm = (element: HTMLElement, index: number) => {
            element.style.opacity = "0"
            element.style.translate = "0 1rem"
            element.style.animationDelay = `${Math.min(index, 6) * 80}ms`
        }

        const show = (element: HTMLElement) => {
            element.style.animationName = "reveal-in"
            element.style.animationDuration = "var(--duration-slow)"
            element.style.animationTimingFunction = "var(--ease-out-fast)"
            element.style.animationFillMode = "backwards"
            element.style.opacity = ""
            element.style.translate = ""
        }

        const hero = [...root.querySelectorAll<HTMLElement>("[data-hero-reveal]")]
        hero.forEach(arm)
        const heroFrame = requestAnimationFrame(() => hero.forEach(show))

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    const element = entry.target as HTMLElement
                    show(element)
                    for (const child of element.querySelectorAll<HTMLElement>(":scope > *")) {
                        show(child)
                    }
                    observer.unobserve(element)
                }
            },
            { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
        )

        const singles = [...root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-hero-reveal])")]
        singles.forEach((element, index) => {
            arm(element, index)
            observer.observe(element)
        })

        for (const group of root.querySelectorAll<HTMLElement>("[data-reveal-group]")) {
            const children = [...group.querySelectorAll<HTMLElement>(":scope > *")]
            children.forEach(arm)
            observer.observe(group)
        }

        return () => {
            cancelAnimationFrame(heroFrame)
            observer.disconnect()
        }
    }, [])

    return <div ref={ref}>{children}</div>
}
