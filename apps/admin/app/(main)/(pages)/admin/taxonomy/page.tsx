import Link from "next/link"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaxonomyService } from "@/lib/services/taxonomy-service"
import { ArchiveButtons } from "./archive-buttons"

/**
 * The category tree.
 *
 * There was no way to create, rename, reorder or retire a category or sub-category from the
 * panel — adding one meant writing a migration. This is the other half of "define a catalogue",
 * the half `/admin/products/new` needed to exist for.
 */
export const dynamic = "force-dynamic"

function nameFor(translations: Array<{ locale: string; name: string; slug: string }>, locale: string) {
    const t = translations.find((x) => x.locale === locale)
    return t ? { name: t.name.trim(), slug: t.slug } : null
}

export default async function TaxonomyPage() {
    await requireCurrentAdmin()
    const categories = await TaxonomyService.tree()

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Categories">
                <Button size="sm" asChild>
                    <Link href="/admin/taxonomy/category/new">New category</Link>
                </Button>
            </DashboardHeader>

            <div className="mt-8">
                <Container>
                    <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
                        A category is its two translation rows — it has no name of its own. Both languages are
                        required, and renaming a URL retires the old one to a redirect rather than breaking it.
                    </p>

                    <div className="space-y-4">
                        {categories.map((category) => {
                            const en = nameFor(category.translations, "en")
                            const ar = nameFor(category.translations, "ar")
                            return (
                                <section key={category.id} className="border rounded-lg bg-card shadow-sm">
                                    <header className="flex flex-wrap items-start justify-between gap-3 p-4 border-b">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-semibold">{en?.name ?? "—"}</h2>
                                                <span className="text-muted-foreground" dir="rtl">
                                                    {ar?.name ?? "—"}
                                                </span>
                                                {category.deletedAt ? (
                                                    <Badge variant="destructive">archived</Badge>
                                                ) : !category.isActive ? (
                                                    <Badge variant="secondary">hidden</Badge>
                                                ) : null}
                                                {/* A missing locale is the defect the storefront would render as a gap. */}
                                                {(!en || !ar) && <Badge variant="destructive">missing a language</Badge>}
                                            </div>
                                            <p className="text-sm text-muted-foreground font-mono mt-1">
                                                /{en?.slug ?? "?"} · /{ar?.slug ?? "?"}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="secondary" asChild>
                                                <Link href={`/admin/taxonomy/category/${category.id}`}>Edit</Link>
                                            </Button>
                                            <Button size="sm" variant="secondary" asChild>
                                                <Link href={`/admin/taxonomy/sub-category/new?category=${category.id}`}>
                                                    Add sub-category
                                                </Link>
                                            </Button>
                                            <ArchiveButtons
                                                kind="category"
                                                id={category.id}
                                                archived={category.deletedAt !== null}
                                            />
                                        </div>
                                    </header>

                                    {category.subCategories.length === 0 ? (
                                        <p className="p-4 text-sm text-muted-foreground">
                                            No sub-categories. Products hang from sub-categories, not from categories.
                                        </p>
                                    ) : (
                                        <ul className="divide-y">
                                            {category.subCategories.map((sub) => {
                                                const subEn = nameFor(sub.translations, "en")
                                                const subAr = nameFor(sub.translations, "ar")
                                                return (
                                                    <li
                                                        key={sub.id}
                                                        className="flex flex-wrap items-center justify-between gap-3 p-4"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-medium">{subEn?.name ?? "—"}</span>
                                                                <span className="text-muted-foreground text-sm" dir="rtl">
                                                                    {subAr?.name ?? "—"}
                                                                </span>
                                                                <Badge variant="outline">
                                                                    {sub._count.products} product
                                                                    {sub._count.products === 1 ? "" : "s"}
                                                                </Badge>
                                                                {sub.deletedAt ? (
                                                                    <Badge variant="destructive">archived</Badge>
                                                                ) : !sub.isActive ? (
                                                                    <Badge variant="secondary">hidden</Badge>
                                                                ) : null}
                                                                {(!subEn || !subAr) && (
                                                                    <Badge variant="destructive">missing a language</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                                                /{subEn?.slug ?? "?"} · /{subAr?.slug ?? "?"}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <Button size="sm" variant="secondary" asChild>
                                                                <Link href={`/admin/taxonomy/sub-category/${sub.id}`}>
                                                                    Edit
                                                                </Link>
                                                            </Button>
                                                            <ArchiveButtons
                                                                kind="subCategory"
                                                                id={sub.id}
                                                                archived={sub.deletedAt !== null}
                                                            />
                                                        </div>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    )}
                                </section>
                            )
                        })}
                    </div>
                </Container>
            </div>
        </div>
    )
}
