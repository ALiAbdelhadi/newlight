"use client"

import { useEffect, useRef } from "react"

/**
 * Reveal every marked descendant, without wrapping each one in a component.
 *
 * `Reveal` is the right tool where a component already owns the element — a card, a section
 * heading. It is the wrong tool for a long editorial page whose markup is already annotated
 * with `data-reveal` markers in eighteen places: converting those to eighteen wrapper
 * components changes the DOM structure and the CSS that depends on it, to achieve exactly what
 * the markers already describe.
 *
 * So this reads the same markers. It is the GSAP block from
 * `technical-resources` with the library taken out, and it keeps that implementation's one
 * genuinely good idea — the three groups mean different things:
 *
 *   `data-hero-reveal`   plays on load; it is above the fold and there is no scroll to wait for
 *   `data-reveal`        one element, on scroll
 *   `data-reveal-group`  the element's CHILDREN, staggered, on scroll
 *
 * IT WRITES INLINE STYLES, NOT CLASSES, and that is not a preference — it is the constraint.
 * The first version added `class="reveal"` and `data-reveal="hidden"` to each target so the
 * appearance came from the same two rules in globals.css as every other reveal. It did not
 * work, and the reason is worth writing down: these elements are rendered by React with their
 * own `className` and `data-reveal` in the JSX, so React owns those attributes and resets them
 * to the values in the source on the next render. The markers survived; the state did not, and
 * the page rendered with nothing armed.
 *
 * `Reveal` does not have this problem because it renders its own class and nothing else sets
 * `data-reveal` on that node. Here the nodes belong to the page.
 *
 * Inline styles are safe for the opposite reason: React only touches the style properties it
 * set, and none of these elements has a `style` prop. It is the same reason GSAP worked on this
 * page — it also wrote inline styles.
 *
 * Reduced motion is checked once and the whole thing is skipped, which leaves the markup in its
 * resting state: visible. The GSAP version had to `clearProps` its way back to that.
 */
export function RevealScope({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const root = ref.current
        if (!root) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        // An inline `transition` would be permanent and would outrank every utility on the
        // node — including the hover transitions of anything that happens to carry one. The
        // shared `reveal-in` keyframes leave `transition-property` and `transition-delay`
        // untouched, so a revealed element's hover still behaves like every other element's.
        const arm = (element: HTMLElement, index: number) => {
            element.style.opacity = "0"
            element.style.translate = "0 1rem"
            element.style.animationDelay = `${Math.min(index, 6) * 80}ms`
        }

        // Longhands, not the `animation` shorthand: the shorthand resets `animation-delay` to
        // 0 and would wipe the stagger `arm` just set on the same inline declaration.
        const show = (element: HTMLElement) => {
            element.style.animationName = "reveal-in"
            element.style.animationDuration = "var(--duration-slow)"
            element.style.animationTimingFunction = "var(--ease-out-fast)"
            element.style.animationFillMode = "backwards"
            // Back to the resting state — visible — with the animation, not these, doing the
            // fade. `backwards` fill covers the stagger delay and then hands the element back.
            element.style.opacity = ""
            element.style.translate = ""
        }

        // Above the fold: no scroll is coming, so these play immediately.
        const hero = [...root.querySelectorAll<HTMLElement>("[data-hero-reveal]")]
        hero.forEach(arm)
        const heroFrame = requestAnimationFrame(() => hero.forEach(show))

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    const element = entry.target as HTMLElement
                    show(element)
                    // A group reveals its children, not itself.
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
