"use client"

import { Container } from "@/components/container"
import { useTranslations } from 'next-intl'
import { CheckCircle2, Package, ShieldCheck, Truck } from 'lucide-react'

export function FeaturesSection() {
    const t = useTranslations('features-section');

    const features = [
        {
            icon: Truck,
            title: t('shippingTitle'),
            description: t('shippingDescription')
        },
        {
            icon: ShieldCheck,
            title: t('warrantyTitle'),
            description: t('warrantyDescription')
        },
        {
            icon: Package,
            title: t('packagingTitle'),
            description: t('packagingDescription')
        },
        {
            icon: CheckCircle2,
            title: t('qualityTitle'),
            description: t('qualityDescription')
        }
    ]

    return (
        <section className="py-24 lg:py-40 relative overflow-hidden">
            <Container>
                <div className="max-w-3xl mb-24 lg:mb-32">
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif italic text-foreground leading-tight tracking-tight">
                        {t('mainHeading')}
                    </h2>
                    <div className="h-px w-32 bg-primary mt-8 opacity-40" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
                    {features.map((feature, index) => (
                        <div key={index} className="group space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
                                <feature.icon className="w-8 h-8 font-light" />
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-xl font-medium tracking-tight text-foreground">
                                    {feature.title}
                                </h3>
                                <p className="text-base font-light leading-relaxed text-muted-foreground tracking-wide">
                                    {feature.description}
                                </p>
                            </div>
                            
                            <div className="h-px w-0 bg-primary group-hover:w-16 transition-all duration-700" />
                        </div>
                    ))}
                </div>

                <div className="mt-24 pt-12 border-t border-border/50">
                    <p className="text-sm uppercase font-bold tracking-[0.4em] text-muted-foreground/60 transition-colors hover:text-primary cursor-default text-center">
                        {t('footerCta')}
                    </p>
                </div>
            </Container>
        </section>
    )
}