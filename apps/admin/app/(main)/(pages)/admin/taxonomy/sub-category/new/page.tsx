import Link from "next/link"
import { prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { TaxonomyForm } from "../../taxonomy-form"

export const dynamic = "force-dynamic"

export default async function NewSubCategoryPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>
}) {
    await requireCurrentAdmin()
    const { category } = await searchParams

    const categories = await prisma.category.findMany({
        where: { deletedAt: null },
        select: { id: true, translations: { where: { locale: "en" }, select: { name: true }, take: 1 } },
        orderBy: { order: "asc" },
    })

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="New sub-category">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/taxonomy">← Categories</Link>
                </Button>
            </DashboardHeader>
            <div className="mt-8">
                <Container>
                    <TaxonomyForm
                        kind="subCategory"
                        existing={null}
                        categoryId={category}
                        categories={categories.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.id }))}
                    />
                </Container>
            </div>
        </div>
    )
}
