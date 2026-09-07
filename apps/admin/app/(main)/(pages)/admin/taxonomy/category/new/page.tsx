import Link from "next/link"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { TaxonomyForm } from "../../taxonomy-form"

export const dynamic = "force-dynamic"

export default async function NewCategoryPage() {
    await requireCurrentAdmin()
    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="New category">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/taxonomy">← Categories</Link>
                </Button>
            </DashboardHeader>
            <div className="mt-8">
                <Container>
                    <TaxonomyForm kind="category" existing={null} />
                </Container>
            </div>
        </div>
    )
}
