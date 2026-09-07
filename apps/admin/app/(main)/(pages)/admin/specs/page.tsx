import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { SpecDefinitionService } from "@/lib/services/spec-definition-service"
import { SpecsManager } from "./specs-manager"

/**
 * The specification dictionary — which measurements exist at all.
 *
 * Seeded by migration `0006` and read-only ever since, so a new kind of fixture with a
 * measurement nobody had thought of could not be described without writing a migration.
 */
export const dynamic = "force-dynamic"

export default async function SpecsPage() {
    await requireCurrentAdmin()
    const definitions = await SpecDefinitionService.list()

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Specifications" />
            <div className="mt-8">
                <Container>
                    <SpecsManager
                        definitions={definitions.map((d) => ({
                            key: d.key,
                            valueType: d.valueType,
                            labelEn: d.labelEn,
                            labelAr: d.labelAr,
                            unitEn: d.unitEn,
                            unitAr: d.unitAr,
                            order: d.order,
                            usedByProducts: d._count.productSpecs,
                            askedByCategories: d._count.subCategories,
                        }))}
                    />
                </Container>
            </div>
        </div>
    )
}
