import { Container, PageHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

/**
 * The privacy policy.
 *
 * A server component. Its GSAP was the gentler kind — `gsap.from`, so the resting state was
 * visible and a failed script left the text readable — but it still pulled GSAP and
 * ScrollTrigger onto a page that is eight headings and some prose, and it scrubbed each section
 * against scroll position, so a section already behind the viewport on load could sit at a
 * fraction of its animation.
 *
 * `Reveal` does the same fade with no library, and stops entirely for
 * `prefers-reduced-motion`.
 */
export function PrivacyClient() {
    const t = useTranslations("privacy-page")

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
        <>
            <PageHeader
                title={t("heroTitle")}
                description={t("heroSubtitle")}
                action={
                    <p className="text-sm text-muted-foreground">
                        {t("lastUpdated")}: {t("updateDate")}
                    </p>
                }
            />

            <section className="py-12 lg:py-16">
                <Container>
                    <div className="mx-auto max-w-4xl space-y-14">
                        {sections.map((section, index) => (
                            <Reveal key={index} index={index} className="space-y-4">
                                <h2 className="font-display text-2xl font-light lg:text-3xl">{section.title}</h2>
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
                            </Reveal>
                        ))}

                        <Reveal className="rounded-lg border bg-surface-sunk p-8 md:p-12">
                            <h2 className="font-display text-2xl font-light lg:text-3xl">{t("contact.title")}</h2>
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{t("contact.content")}</p>
                            <div className="mt-6 space-y-2 text-muted-foreground">
                                <p>
                                    <span className="font-medium text-foreground">{t("contact.emailLabel")}:</span> {t("contact.email")}
                                </p>
                                <p>
                                    <span className="font-medium text-foreground">{t("contact.phoneLabel")}:</span>
                                    <Link dir="ltr" href="tel:+201066076077">
                                        {t("contact.phone")}
                                    </Link>
                                </p>
                                <p>
                                    <span className="font-medium text-foreground">{t("contact.addressLabel")}:</span>{" "}
                                    {t("contact.address")}
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </Container>
            </section>
        </>
    )
}
