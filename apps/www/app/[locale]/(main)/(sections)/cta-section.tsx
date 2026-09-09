import { getTranslations } from "next-intl/server"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"
import { Link } from "@/i18n/navigation"

/**
 * The closing ask.
 *
 * `SectionHeader` in its centred display form, rather than a hand-set `h2` at one size larger
 * than every other section heading on the page: this is one of the two or three moments that
 * earn the display face, and it earns it at the same scale as the collection headline above.
 */
export async function CTASection() {
    const t = await getTranslations("cta-section")

    return (
        <Section tone="sunk" aria-label={t("heading")}>
            <Container>
                <Reveal>
                    <SectionHeader
                        align="center"
                        face="display"
                        title={t("heading")}
                        description={t("description")}
                        className="mb-0 lg:mb-0"
                    />
                    <div className="mt-10 text-center">
                        <Link
                            href={t("buttonHref")}
                            className="group inline-flex h-12 items-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary/90"
                        >
                            {t("buttonText")}
                            <DirectionalArrow />
                        </Link>
                    </div>
                </Reveal>
            </Container>
        </Section>
    )
}
