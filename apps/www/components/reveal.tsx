"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

/**
 * A section that fades in when it is scrolled to.
 *
 * This exists to replace a pattern that appears in seventeen files across the storefront and is
 * wrong in the same way in all of them:
 *
 *     gsap.set([heading, description, button], { opacity: 0, y: 40 })
 *     tl.to(heading, { opacity: 1, y: 0, scrollTrigger: … })
 *
 * The content's RESTING state is invisible, and only JavaScript makes it visible. If the bundle
 * is slow, blocked by a corporate proxy, or throws before the effect runs, the page renders
 * empty — not degraded, empty. That was not theoretical: on `/category` the first card rendered
 * as an empty box, because its ScrollTrigger range (`top 75%` → `top 35%`, scrubbed) was already
 * behind the viewport at load and therefore never fired. It also ran regardless of
 * `prefers-reduced-motion`, because GSAP animates inline styles and a CSS media query cannot
 * reach them.
 *
 * The inversion here is the whole point: THE RESTING STATE IS VISIBLE. The hidden state is
 * applied by the effect — so only when JavaScript is actually running — and it is skipped
 * entirely when the visitor has asked for reduced motion. Nothing can leave the page blank,
 * because "blank" is not a state the server-rendered markup can be in.
 *
 * IT HOLDS NO REACT STATE. Arming and revealing are a `data-reveal` attribute written straight
 * to the node, with the keyframes declared in globals.css. Two `useState`s would re-render the
 * subtree twice per card for a fade, and setting state inside an effect is the cascading render
 * the compiler lint rule rejects.
 *
 * `IntersectionObserver` rather than GSAP ScrollTrigger: it is 0 bytes, it is what ScrollTrigger
 * is built on, and this is a one-shot fade — the storefront's remaining GSAP usage is for the
 * genuinely timeline-shaped work, not for this.
 */
export function Reveal({
    children,
    className,
    /** Stagger a group by passing an index. 60ms apart, capped so a long list does not crawl. */
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
        // `animationDelay`, NOT `transitionDelay`. An inline transition delay never goes away:
        // it applied to the card's hover lift too, so the sixth tile in a row sat still for
        // 360ms after the pointer arrived. The reveal is a keyframe animation (globals.css) for
        // exactly this reason — its delay belongs to the animation and to nothing else.
        element.style.animationDelay = `${Math.min(index, 6) * 60}ms`

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    element.dataset.reveal = "shown"
                    observer.disconnect()
                }
            },
            // Fires slightly before the section reaches the fold, so the fade finishes as it
            // arrives rather than starting once it is already being read.
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
