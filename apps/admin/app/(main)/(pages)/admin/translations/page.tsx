import Link from "next/link"
import { LOCALES } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TranslationService } from "@/lib/services/translation-service"
import { CatalogService } from "@/lib/services/catalog-service"

/**
 * §13.2 item 7: the missing-translations queue, and the N5 data-quality queue beside it.
 *
 * Neither list repairs anything. They report, and every row links to the one screen that can
 * fix it — a queue that fixes things itself is a queue whose output nobody reviewed.
 */
export const dynamic = "force-dynamic"

export default async function TranslationsPage() {
    await requireCurrentAdmin()

    const [queue, coverage, quality] = await Promise.all([
        TranslationService.queue(200),
        TranslationService.coverage(),
        CatalogService.dataQualityQueue(),
    ])

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Translations" />
            <div className="mt-8">
                <Container>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {LOCALES.map((locale) => {
                            const c = coverage.perLocale[locale]
                            return (
                                <div key={locale} className="bg-card rounded-lg border p-4 shadow-sm">
                                    <p className="text-sm text-muted-foreground mb-1 uppercase">{locale}</p>
                                    <p className="text-2xl font-bold tabular-nums">
                                        {c.complete}
                                        <span className="text-base font-normal text-muted-foreground">
                                            {" "}
                                            / {coverage.products} complete
                                        </span>
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {c.partial} partial · {c.absent} with no row at all
                                    </p>
                                </div>
                            )
                        })}
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <p className="text-sm text-muted-foreground mb-1">Needing work</p>
                            <p className="text-2xl font-bold tabular-nums">{queue.total}</p>
                        </div>
                    </div>

                    <section className="mb-10">
                        <h2 className="font-semibold text-lg mb-1">Missing translations</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Worst first: a product with no Arabic row at all outranks one that only lacks a meta
                            description. A name that is just the SKU counts as untranslated, because it is.
                        </p>
                        <div className="overflow-x-auto border rounded-lg shadow max-h-[36rem]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        {LOCALES.map((locale) => (
                                            <TableHead key={locale} className="uppercase">
                                                {locale}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-right">Fields missing</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {queue.rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                Every product is fully translated in both languages.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        queue.rows.map((row) => (
                                            <TableRow key={row.entityId}>
                                                <TableCell className="font-mono">{row.reference}</TableCell>
                                                {LOCALES.map((locale) => {
                                                    const c = row.completeness[locale]
                                                    return (
                                                        <TableCell key={locale}>
                                                            {!row.locales[locale].exists ? (
                                                                <Badge variant="destructive">no row</Badge>
                                                            ) : c.missing.length === 0 ? (
                                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                    complete
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">
                                                                    {c.missing.join(", ")}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    )
                                                })}
                                                <TableCell className="text-right tabular-nums">{row.missingCount}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="secondary" asChild>
                                                        <Link href={`/admin/products/${row.entityId}?tab=translations`}>
                                                            Translate
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </section>

                    <section>
                        <h2 className="font-semibold text-lg mb-1">Data quality</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Carried across from the v1 catalog exactly as it was, and reported rather than repaired —
                            a migration that quietly improves data is one whose output cannot be checked against its
                            input.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "Arabic taxonomy names",
                                    value: quality.taxonomyDefects.length,
                                    note: quality.taxonomyDefects
                                        .slice(0, 3)
                                        .map((t) => `${t.name.trim()}${t.untrimmed ? " (trailing space)" : ""}`)
                                        .join(", "),
                                },
                                {
                                    label: "Placeholder specs",
                                    value: quality.placeholderSpecs,
                                    note: 'a stored value of "-" rather than a real measurement',
                                },
                                {
                                    label: "Boolean specs (N4)",
                                    value: quality.booleanSpecs.length,
                                    note: quality.booleanSpecs
                                        .slice(0, 3)
                                        .map((s) => `${s.product.productId}/${s.specKey}`)
                                        .join(", "),
                                },
                                {
                                    label: "Products with no image",
                                    value: quality.noImages.length,
                                    note: quality.noImages.slice(0, 3).map((p) => p.productId).join(", "),
                                },
                                {
                                    label: "Products with no colour",
                                    value: quality.noColors.length,
                                    note: quality.noColors.slice(0, 3).map((p) => p.productId).join(", "),
                                },
                            ].map((card) => (
                                <div key={card.label} className="bg-card rounded-lg border p-4 shadow-sm">
                                    <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                                    <p className={`text-2xl font-bold tabular-nums ${card.value > 0 ? "text-yellow-600" : ""}`}>
                                        {card.value}
                                    </p>
                                    {card.value > 0 && card.note && (
                                        <p className="text-xs text-muted-foreground mt-2 font-mono break-words">{card.note}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </Container>
            </div>
        </div>
    )
}
