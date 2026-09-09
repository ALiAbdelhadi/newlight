import { getTranslations } from "next-intl/server"
import { CheckCircle2, Package, ShieldCheck, Truck } from "lucide-react"

import { Container, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"

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
