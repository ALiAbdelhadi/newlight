"use client"

import { Container } from "@/components/container"
import type { ProductSpec } from "@/lib/product-specifications"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface SpecificationTableProps {
    specs: ProductSpec[]
    technicalLabel: string
    title: string
    locale?: string
    sectionRef?: React.RefObject<HTMLElement>
}

/**
 * Reusable specifications table section.
 * Keeps rendering logic separate from page so we can reuse across locales.
 */
const SpecificationTable = forwardRef<HTMLElement, SpecificationTableProps>(
    ({ specs, technicalLabel, title, locale = "en", sectionRef }, ref) => {
        if (!specs.length) return null

        return (
            <section
                ref={sectionRef || ref}
                className="border-t border-border bg-secondary/20 py-20 lg:py-28"
                dir={locale === "ar" ? "rtl" : "ltr"}
            >
                <Container>
                    <div className="mb-12">
                        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light mb-4">
                            {technicalLabel}
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light tracking-tight text-foreground">
                            {title}
                        </h2>
                        <div className={cn("h-px w-16 bg-accent mt-4", locale === "ar" && "ml-auto")} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        {specs.map((spec, index) => (
                            <div
                                key={index}
                                className="bg-card border border-border rounded-sm p-6 hover:border-accent/50 transition-colors duration-300"
                            >
                                <p className="text-xs uppercase tracking-widest text-muted-foreground font-light mb-2">
                                    {spec.label}
                                </p>
                                <p className="text-lg font-light text-foreground tracking-wide">
                                    {spec.formattedValue ?? String(spec.value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>
        )
    }
)

SpecificationTable.displayName = "SpecificationTable"

export default SpecificationTable

