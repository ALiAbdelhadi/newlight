import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { resolveLocale } from "@repo/database"

import { CompareTable } from "@/components/compare/compare-table"
import { Container, PageHeader } from "@/components/layout/section"
import { constructMetadata } from "@/lib/metadata"

/**
 * Side by side.
 *
 * Its own page rather than a drawer over the listing, and that is the right call for what this
 * screen is: a wide table that a specifier reads, links to a colleague, and comes back to. A
 * panel over the grid would be none of those, and on a phone it would be a table inside a
 * sheet.
 *
 * NOINDEX. The selection lives in the visitor's browser, so every crawl of this URL would see
 * an empty page — and an empty page indexed under a real path is worse than no page.
 */
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
