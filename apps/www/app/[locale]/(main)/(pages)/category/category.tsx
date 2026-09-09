import { useTranslations } from "next-intl"

import CategoryCard from "@/components/category-card"
import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, PageHeader, Section, SectionHeader } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

type Category = {
    key: string
    slug: string
    name: string
    description: string
    imageUrl: string
}

interface CategoriesSectionProps {
    categories: Category[]
}

export default function CategoriesSection({ categories }: CategoriesSectionProps) {
    const t = useTranslations("categories-page")

    return (
        <>
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("heroTitle")}
                description={t("heroSubtitle")}
                action={
                    categories.length > 0 ? (
                        <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-label text-muted-foreground uppercase">
                            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                            {t("count", { count: categories.length })}
                        </span>
                    ) : undefined
                }
            />

            <Section spacing="tight">
                <Container>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12 xl:grid-cols-4">
                        {categories.map((category, index) => (
                            <CategoryCard
                                key={category.key}
                                title={category.name}
                                subtitle={t("exploreCollection")}
                                description={category.description}
                                imageUrl={category.imageUrl || ""}
                                href={`/category/${category.slug}`}
                                index={index}
                            />
                        ))}
                    </div>
                </Container>
            </Section>

            <Section tone="sunk" aria-label={t("ctaTitle")}>
                <Container>
                    <SectionHeader
                        eyebrow={t("ctaEyebrow")}
                        title={t("ctaTitle")}
                        description={t("ctaDescription")}
                        face="display"
                        className="mb-0 lg:mb-0"
                        action={
                            <div className="flex flex-wrap gap-3">
                                <Button asChild variant="outline" size="lg">
                                    <Link href="/contact">{t("ctaContact")}</Link>
                                </Button>
                                <Button asChild size="lg" className="group">
                                    <Link href="/about">
                                        {t("ctaLearn")}
                                        <DirectionalArrow />
                                    </Link>
                                </Button>
                            </div>
                        }
                    />
                </Container>
            </Section>
        </>
    )
}
