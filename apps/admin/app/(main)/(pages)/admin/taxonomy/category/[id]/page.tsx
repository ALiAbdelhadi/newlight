import Link from "next/link"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { TaxonomyService } from "@/lib/services/taxonomy-service"
import { TaxonomyForm } from "../../taxonomy-form"

export const dynamic = "force-dynamic"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    await requireCurrentAdmin()
    const { id } = await params
    const category = await TaxonomyService.category(id)

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Category">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/taxonomy">← Categories</Link>
                </Button>
            </DashboardHeader>
            <div className="mt-8">
                <Container>
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
                </Container>
            </div>
        </div>
    )
}
