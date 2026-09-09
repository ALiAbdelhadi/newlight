import { getTranslations } from "next-intl/server"
import { CheckCircle2, Package, ShieldCheck, Truck } from "lucide-react"

import { Container, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"

/**
 * What buying from NewLight involves — shipping, warranty, packaging, quality.
 *
 * A SERVER COMPONENT: it had `"use client"` for four static icons and no interactivity.
 *
 * The visual devices came down to one. It was a 72px italic display heading (the third on the
 * homepage using the same device), four `rounded-2xl` icon tiles that grew, changed colour, and
 * grew a coloured shadow on hover, an animated underline per card, and a centred uppercase
 * sentence at `tracking-[0.4em]` that was not a link and did nothing. Four hover animations on
 * four cards that say what the shipping policy is do not make the shipping policy clearer.
 */
export async function FeaturesSection() {
    const t = await getTranslations("features-section")

    const features = [
        { icon: Truck, title: t("shippingTitle"), description: t("shippingDescription") },
        { icon: ShieldCheck, title: t("warrantyTitle"), description: t("warrantyDescription") },
        { icon: Package, title: t("packagingTitle"), description: t("packagingDescription") },
        { icon: CheckCircle2, title: t("qualityTitle"), description: t("qualityDescription") },
    ]

    return (
        <Section>
            <Container>
                <SectionHeader title={t("mainHeading")} />

                <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
                    {features.map((feature, index) => (
                        <Reveal as="li" key={feature.title} index={index}>
                            <feature.icon aria-hidden className="size-6 text-primary" />
                            <h3 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h3>
                            <p className="mt-2 text-pretty text-muted-foreground">{feature.description}</p>
                        </Reveal>
                    ))}
                </ul>
            </Container>
        </Section>
    )
}
