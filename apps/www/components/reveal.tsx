"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

export function Reveal({
    children,
    className,
    index = 0,
    as: Tag = "div",
    ...props
}: React.HTMLAttributes<HTMLElement> & {
    children: React.ReactNode
    index?: number
    as?: "div" | "section" | "li" | "figure"
}) {
    const ref = useRef<HTMLElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        element.dataset.reveal = "hidden"
        element.style.animationDelay = `${Math.min(index, 6) * 60}ms`

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    element.dataset.reveal = "shown"
                    observer.disconnect()
                }
            },
            { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
        )

        observer.observe(element)
        return () => observer.disconnect()
    }, [index])

    return (
        <Tag ref={ref as React.Ref<never>} className={cn("reveal", className)} {...props}>
            {children}
        </Tag>
    )
}
