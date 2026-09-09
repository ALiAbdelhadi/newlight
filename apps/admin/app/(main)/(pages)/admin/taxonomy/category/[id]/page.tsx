import { requireCurrentAdmin } from "@/lib/auth"
import { TaxonomyService } from "@/lib/services/taxonomy-service"
import { TaxonomyForm } from "../../taxonomy-form"
import { PageBody, PageHeader } from "@/components/page"

export const dynamic = "force-dynamic"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    await requireCurrentAdmin()
    const { id } = await params
    const category = await TaxonomyService.category(id)

    const name = category.translations.find((t) => t.locale === "en")?.name.trim()

    return (
        <>
            <PageHeader
                eyebrow="Category"
                title={name || "Untitled category"}
                description="A category is its two translation rows. Both languages are required; renaming a URL retires the old one to a redirect rather than breaking it."
            />

            <PageBody>
                <TaxonomyForm
                    kind="category"
                    existing={{
                        id: category.id,
                        imageUrl: category.imageUrl,
                        order: category.order,
                        isActive: category.isActive,
                        translations: category.translations,
                    }}
                />
            </PageBody>
        </>
    )
}
