"use client"

import { Container } from "@/components/container"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { CheckCircle, Lightbulb, PenTool, Shield, Truck } from "lucide-react"
import type React from "react"
import { useEffect, useRef } from "react"
import { useTranslations } from 'next-intl'; 

gsap.registerPlugin(ScrollTrigger)

interface FeatureData {
    title: string
    description: string
}

interface Feature extends FeatureData {
    icon: React.ReactNode
}

const localIcons: React.ReactNode[] = [
    <PenTool className="w-8 h-8 text-foreground" key="pen-tool" />,
    <Lightbulb className="w-8 h-8 text-foreground" key="lightbulb" />,
    <Truck className="w-8 h-8 text-foreground" key="truck" />,
    <Shield className="w-8 h-8 text-foreground" key="shield" />,
    <CheckCircle className="w-8 h-8 text-foreground" key="check-circle" />,
]

export function FeaturesSection() {
    const t = useTranslations('features-section');

    const sectionRef = useRef<HTMLDivElement>(null)
    const featureRefs = useRef<HTMLDivElement[]>([])

    const translatedFeaturesData = t.raw('features') as FeatureData[];

    const features: Feature[] = translatedFeaturesData.map((data, index) => ({
        ...data,
        icon: localIcons[index] || <Lightbulb className="w-8 h-8 text-foreground" />,
    }));

    useEffect(() => {
        const ctx = gsap.context(() => {
            featureRefs.current.forEach((ref, index) => {
                gsap.set(ref, {
                    opacity: 0,
                    y: 60,
                })

                gsap.to(ref, {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: ref,
                        start: "top 80%",
                        end: "top 50%",
                        scrub: 1,
                        once: true,
                    },
                    delay: index * 0.15,
                })
            })
        })

        return () => ctx.revert()
    }, [])

    return (
        <section ref={sectionRef} className="min-h-screen bg-card text-card-foreground lg:py-16 py-12">
            <Container>
                <div className="mb-16">
                    <h2 className="text-5xl md:text-6xl font-light tracking-tighter mb-4 text-balance">
                        {t('headerTitle')}
                    </h2>
                    <div className="h-px w-12 bg-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            ref={(el) => {
                                if (el) featureRefs.current[index] = el
                            }}
                            className="flex flex-col"
                        >
                            <div className="mb-6 text-primary shrink-0">{feature.icon}</div>
                            <h3 className="text-2xl md:text-3xl font-light tracking-tight mb-4">{feature.title}</h3>
                            <p className="text-base font-light text-muted-foreground tracking-wide leading-relaxed">
                                {feature.description}
                            </p>
                            <div className="mt-6 h-px w-12 bg-border" />
                        </div>
                    ))}
                </div>
                <div className="mt-16 pt-12 border-t border-border">
                    <p className="text-sm uppercase font-light tracking-widest text-muted-foreground">
                        {t('footerCta')}
                    </p>
                </div>
            </Container>
        </section>
    )
}