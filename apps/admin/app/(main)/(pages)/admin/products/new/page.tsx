import Link from "next/link"
import { prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { NewProductForm } from "./new-product-form"

/**
 * §13.2 did not ask for this, and the panel was unusable as an ERP without it: every editing
 * screen P5 built operates on a product that already exists, and nothing could make one.
 */
export const dynamic = "force-dynamic"

export default async function NewProductPage() {
    await requireCurrentAdmin()

    const [subCategories, families] = await Promise.all([
        prisma.subCategory.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                translations: { where: { locale: "en" }, select: { name: true }, take: 1 },
                category: { select: { translations: { where: { locale: "en" }, select: { name: true }, take: 1 } } },
            },
            orderBy: { order: "asc" },
        }),
        prisma.productFamily.findMany({
            select: { id: true, slug: true, subCategoryId: true, variantType: true },
            orderBy: { slug: "asc" },
        }),
    ])

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="New product">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/products">← All products</Link>
                </Button>
            </DashboardHeader>
            <div className="mt-8">
                <Container>
                    <NewProductForm
                        subCategories={subCategories.map((s) => ({
                            id: s.id,
                            name: `${s.category.translations[0]?.name ?? "—"} / ${s.translations[0]?.name ?? s.id}`,
                        }))}
                        families={families.map((f) => ({
                            id: f.id,
                            subCategoryId: f.subCategoryId,
                            name: f.slug,
                            variantType: f.variantType,
                        }))}
                    />
                </Container>
            </div>
        </div>
    )
}
