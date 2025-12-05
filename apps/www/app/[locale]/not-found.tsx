"use client"

import { useEffect, useRef } from "react"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null)
  const numberRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set([numberRef.current, textRef.current, buttonsRef.current], {
        opacity: 0,
        y: 30,
      })

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      })

      timeline.to(numberRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
      })

      timeline.to(
        textRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
        },
        0.2,
      )

      timeline.to(
        buttonsRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
        },
        0.4,
      )

      gsap.to(numberRef.current, {
        y: -10,
        duration: 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={containerRef}
      className="min-h-screen text-foreground flex items-center justify-center px-6"
    >
      <div className="max-w-2xl w-full text-center">
        <div ref={numberRef} className="mb-8">
          <h1 className="text-9xl lg:text-10xl font-light tracking-tighter mb-4">404</h1>
          <div className="h-px w-24 bg-border/30 mx-auto" />
        </div>

        <div ref={textRef} className="mb-12">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-4 text-foreground">Page Not Found</h2>
          <p className="text-lg md:text-xl font-light tracking-wide text-muted-foreground mb-8">
            The page you are looking for might have been removed or is temporarily unavailable. Let us help you find
            what you need.
          </p>
        </div>

        <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-3 bg-primary text-primary-foreground font-light tracking-wide transition-all duration-300 hover:bg-primary/90 uppercase text-sm"
          >
            Return Home
          </Link>
          <Link
            href="/contact"
            className="px-8 py-3 border border-border text-foreground font-light tracking-wide transition-all duration-300 hover:bg-secondary uppercase text-sm"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
