import { requireCurrentAdmin } from "@/lib/auth"
import { TaxonomyService } from "@/lib/services/taxonomy-service"
import { TaxonomyForm } from "../../taxonomy-form"
import { PageBody, PageHeader } from "@/components/page"

export const dynamic = "force-dynamic"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    await requireCurrentAdmin()
    const { id } = await params
    const category = await TaxonomyService.category(id)

    /*
     * The record is named by its English translation, not by the word "Category". A screen
     * titled with its own type tells an operator nothing they did not know from clicking the
     * link, and two of these open in two tabs are then indistinguishable.
     */
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
