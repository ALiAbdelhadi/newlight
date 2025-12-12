"use client"

import gsap from "gsap"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

export default function Loading() {
  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])

  const t = useTranslations("LoadingScreen")

  useEffect(() => {

    const ctx = gsap.context(() => {
      const dots = dotsRef.current.filter(Boolean)

      if (dots.length === 0) return
      const timeline = gsap.timeline({ repeat: -1 })

      dots.forEach((dot, index) => {
        timeline.to(
          dot,
          {
            opacity: 0.3,
            scale: 1.2,
            duration: 0.6,
            ease: "sine.inOut",
          },
          index * 0.2,
        )
        timeline.to(
          dot,
          {
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: "sine.inOut",
          },
          index * 0.2 + 0.3,
        )
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={containerRef}
      className="min-h-screen text-foreground flex items-center justify-center px-6"
    >
      <div className="text-center">
        <div className="mb-8">
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                ref={(el) => {
                  if (el) dotsRef.current[i] = el
                }}
                className="w-3 h-3 rounded-full bg-primary"
              />
            ))}
          </div>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight text-foreground mb-2">
            {t("title")}
          </h2>
          <p className="text-muted-foreground font-light tracking-wide">
            {t("message")}
          </p>
        </div>
        <div className="h-px w-16 bg-border/30 mx-auto mt-8" />
      </div>
    </div>
  )
}