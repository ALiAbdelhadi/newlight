import Link from "next/link"
import { prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaxonomyService } from "@/lib/services/taxonomy-service"
import { SpecDefinitionService } from "@/lib/services/spec-definition-service"
import { TaxonomyForm } from "../../taxonomy-form"
import { AssignedSpecs } from "./assigned-specs"

export const dynamic = "force-dynamic"

export default async function EditSubCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    await requireCurrentAdmin()
    const { id } = await params

    const [subCategory, categories, specs] = await Promise.all([
        TaxonomyService.subCategory(id),
        prisma.category.findMany({
            where: { deletedAt: null },
            select: { id: true, translations: { where: { locale: "en" }, select: { name: true }, take: 1 } },
            orderBy: { order: "asc" },
        }),
        SpecDefinitionService.forSubCategory(id),
    ])

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Sub-category">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/taxonomy">← Categories</Link>
                </Button>
            </DashboardHeader>
            <div className="mt-8">
                <Container>
                    <div className="flex flex-wrap gap-2 mb-6">
                        <Badge variant="outline">
                            {subCategory._count.products} product{subCategory._count.products === 1 ? "" : "s"}
                        </Badge>
                        <Badge variant="outline">
                            {subCategory._count.families} famil{subCategory._count.families === 1 ? "y" : "ies"}
                        </Badge>
                    </div>
                    <TaxonomyForm
                        kind="subCategory"
                        categoryId={subCategory.categoryId}
                        categories={categories.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.id }))}
                        existing={{
                            id: subCategory.id,
                            imageUrl: subCategory.imageUrl,
                            order: subCategory.order,
                            isActive: subCategory.isActive,
                            translations: subCategory.translations,
                        }}
                    />

                    <div className="mt-8 max-w-4xl">
                        <AssignedSpecs
                            subCategoryId={subCategory.id}
                            definitions={specs.all.map((d) => ({
                                key: d.key,
                                labelEn: d.labelEn,
                                labelAr: d.labelAr,
                                unitEn: d.unitEn,
                            }))}
                            assigned={specs.assigned.map((a) => ({ specKey: a.specKey, required: a.required }))}
                        />
                    </div>
                </Container>
            </div>
        </div>
    )
}
