import Link from "next/link"
import { prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { PricingEditor } from "./pricing-editor"

/**
 * §13.2 item 1 — the bulk price editor.
 *
 * It exists because its absence is what put the owner in psql repricing 189 products by hand,
 * with no preview and no record of what changed.
 */
export const dynamic = "force-dynamic"

export default async function PricingPage() {
    await requireCurrentAdmin()

    const [categories, subCategories, families] = await Promise.all([
        prisma.category.findMany({
            where: { deletedAt: null },
            select: { id: true, translations: { where: { locale: "en" }, select: { name: true }, take: 1 } },
            orderBy: { order: "asc" },
        }),
        prisma.subCategory.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                categoryId: true,
                translations: { where: { locale: "en" }, select: { name: true }, take: 1 },
                _count: { select: { products: true } },
            },
            orderBy: { order: "asc" },
        }),
        prisma.productFamily.findMany({
            select: { id: true, slug: true, subCategoryId: true, _count: { select: { products: true } } },
            orderBy: { slug: "asc" },
        }),
    ])

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Bulk pricing">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/products">← All products</Link>
                </Button>
            </DashboardHeader>
            <div className="mt-8">
                <Container>
                    <PricingEditor
                        categories={categories.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.id }))}
                        subCategories={subCategories.map((s) => ({
                            id: s.id,
                            categoryId: s.categoryId,
                            name: s.translations[0]?.name ?? s.id,
                            productCount: s._count.products,
                        }))}
                        families={families.map((f) => ({
                            id: f.id,
                            subCategoryId: f.subCategoryId,
                            name: f.slug,
                            productCount: f._count.products,
                        }))}
                    />
                </Container>
            </div>
        </div>
    )
}
