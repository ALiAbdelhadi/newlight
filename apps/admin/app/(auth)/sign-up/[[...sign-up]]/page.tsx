"use client"

import { Container } from "@/components/container"
import { ThemedSignUp } from "@/components/themed-sign-up"
import gsap from "gsap"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Suspense, useEffect, useRef } from "react"

export default function SignUpPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set([imageRef.current, contentRef.current], { opacity: 0 })
      gsap.set(backButtonRef.current, { opacity: 0, y: -20 })

      const masterTl = gsap.timeline({ defaults: { ease: "power3.out" } })

      masterTl.to(backButtonRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0)
      masterTl.to(imageRef.current, { opacity: 1, duration: 1.2 }, 0.2)
      masterTl.to(contentRef.current, { opacity: 1, duration: 1.2 }, 0.2)
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground pt-24 pb-12">
      <Container>
        <div ref={backButtonRef} className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-light tracking-wide hover:text-primary transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-border overflow-hidden">
            <div ref={imageRef} className="hidden lg:block relative min-h-175 overflow-hidden bg-muted">
              <Image src="/products/outdoor/bollard/nl-b-frame/nl-b-frame (1).png" alt="Join New Light" fill className="object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/40 to-transparent flex flex-col justify-end p-12">
                <div className="space-y-4">
                  <h2 className="text-5xl font-light tracking-tight text-white">Join Us</h2>
                  <p className="text-lg font-light text-white/70 tracking-wide">
                    Create your account to discover premium lighting solutions
                  </p>
                </div>
              </div>
            </div>
            <div
              ref={contentRef}
              className="flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm"
            >
              <div className="w-full max-w-sm space-y-8">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-16">
                      <div className="space-y-2 text-center">
                        <div className="flex justify-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse" />
                          <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse animation-delay-100" />
                          <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse animation-delay-200" />
                        </div>
                        <p className="text-xs font-light text-muted-foreground">Loading...</p>
                      </div>
                    </div>
                  }
                >
                  <ThemedSignUp />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}