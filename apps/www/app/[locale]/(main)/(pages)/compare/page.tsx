import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { resolveLocale } from "@repo/database"

import { CompareTable } from "@/components/compare/compare-table"
import { Container, PageHeader } from "@/components/layout/section"
import { constructMetadata } from "@/lib/metadata"

export const dynamic = "force-static"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("compare")
    const locale = resolveLocale(await getLocale())
    return {
        ...constructMetadata({ title: t("metaTitle"), description: t("metaDescription"), locale }),
        robots: { index: false, follow: true },
    }
}

export default async function ComparePage() {
    const t = await getTranslations("compare")

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <Container className="py-10 lg:py-14">
                <CompareTable />
            </Container>
        </>
    )
}
