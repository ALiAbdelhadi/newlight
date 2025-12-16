"use client"

import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

export function PrivacyClient() {
    const t = useTranslations("privacy-page")
    const heroRef = useRef<HTMLDivElement>(null)
    const sectionsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            if (heroRef.current) {
                gsap.from(heroRef.current.children, {
                    opacity: 0,
                    y: 30,
                    duration: 1,
                    stagger: 0.2,
                    ease: "power3.out",
                    once: true
                })
            }
            if (sectionsRef.current) {
                const sections = sectionsRef.current.querySelectorAll(".privacy-section")
                sections.forEach((section) => {
                    gsap.from(section, {
                        opacity: 0,
                        y: 40,
                        duration: 0.8,
                        scrollTrigger: {
                            trigger: section,
                            start: "top 85%",
                            end: "top 60%",
                            scrub: 1,
                            once: true
                        },
                    })
                })
            }
        })

        return () => ctx.revert()
    }, [])

    const sections = [
        {
            title: t("sections.dataCollection.title"),
            content: t("sections.dataCollection.content"),
            items: t.raw("sections.dataCollection.items") as string[],
        },
        {
            title: t("sections.dataUsage.title"),
            content: t("sections.dataUsage.content"),
            items: t.raw("sections.dataUsage.items") as string[],
        },
        {
            title: t("sections.cookies.title"),
            content: t("sections.cookies.content"),
            items: t.raw("sections.cookies.items") as string[],
        },
        {
            title: t("sections.dataSecurity.title"),
            content: t("sections.dataSecurity.content"),
            items: t.raw("sections.dataSecurity.items") as string[],
        },
        {
            title: t("sections.userRights.title"),
            content: t("sections.userRights.content"),
            items: t.raw("sections.userRights.items") as string[],
        },
        {
            title: t("sections.dataSharing.title"),
            content: t("sections.dataSharing.content"),
            items: t.raw("sections.dataSharing.items") as string[],
        },
        {
            title: t("sections.childrenPrivacy.title"),
            content: t("sections.childrenPrivacy.content"),
        },
        {
            title: t("sections.policyChanges.title"),
            content: t("sections.policyChanges.content"),
        },
    ]

    return (
        <div className="min-h-screen">
            <section className="relative py-24 md:py-32">
                <Container>
                    <div ref={heroRef} className="mx-auto max-w-3xl text-center">
                        <h1 className="font-serif text-5xl font-light tracking-tight text-foreground md:text-6xl lg:text-7xl">
                            {t("heroTitle")}
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">{t("heroSubtitle")}</p>
                        <div className="mt-8 text-sm text-muted-foreground">
                            {t("lastUpdated")}: {t("updateDate")}
                        </div>
                    </div>
                </Container>
            </section>
            <section className="py-16">
                <Container>
                    <div ref={sectionsRef} className="mx-auto max-w-4xl space-y-16">
                        {sections.map((section, index) => (
                            <div key={index} className="privacy-section space-y-4">
                                <h2 className="font-serif text-3xl font-light text-foreground md:text-4xl">{section.title}</h2>
                                <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{section.content}</p>
                                {section.items && section.items.length > 0 && (
                                    <ul className="mt-4 space-y-3 text-muted-foreground">
                                        {section.items.map((item, itemIndex) => (
                                            <li key={itemIndex} className="flex gap-3">
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                <span className="text-base leading-relaxed md:text-lg">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                        <div className="privacy-section rounded-lg border border-border bg-muted/30 p-8 md:p-12">
                            <h2 className="font-serif text-3xl font-light text-foreground md:text-4xl">{t("contact.title")}</h2>
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{t("contact.content")}</p>
                            <div className="mt-6 space-y-2 text-muted-foreground">
                                <p>
                                    <span className="font-medium text-foreground">{t("contact.emailLabel")}:</span> {t("contact.email")}
                                </p>
                                <p>
                                    <span className="font-medium text-foreground">{t("contact.phoneLabel")}:</span>
                                    <Link href="tel:+201066076077">
                                        {t("contact.phone")}
                                    </Link>
                                </p>
                                <p>
                                    <span className="font-medium text-foreground">{t("contact.addressLabel")}:</span>{" "}
                                    {t("contact.address")}
                                </p>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>
        </div>
    )
}
