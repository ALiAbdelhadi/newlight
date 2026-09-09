import { prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { TaxonomyService } from "@/lib/services/taxonomy-service"
import { SpecDefinitionService } from "@/lib/services/spec-definition-service"
import { TaxonomyForm } from "../../taxonomy-form"
import { AssignedSpecs } from "./assigned-specs"
import { PageBody, PageHeader, PageStack, Section } from "@/components/page"

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

    const name = subCategory.translations.find((t) => t.locale === "en")?.name.trim()

    return (
        <>
            <PageHeader
                eyebrow="Sub-category"
                title={name || "Untitled sub-category"}
                description="Products hang from sub-categories. What is assigned here decides which specifications a product in it is asked for."
                actions={
                    <p className="text-xs tabular-nums text-muted-foreground">
                        {subCategory._count.products} product{subCategory._count.products === 1 ? "" : "s"} ·{" "}
                        {subCategory._count.families} famil{subCategory._count.families === 1 ? "y" : "ies"}
                    </p>
                }
            />

            <PageBody>
                <PageStack>
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

                <Section
                    title="Specifications asked for"
                    description="Every product in this sub-category is asked for these fields. A required one blocks publishing until it has a value."
                    className="max-w-4xl"
                >
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
                </Section>
                </PageStack>
            </PageBody>
        </>
    )
}
