import { prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColorService, FamilyService, LocationService } from "@/lib/services/reference-service"
import { FamiliesPanel } from "./families-panel"
import { ColorsPanel } from "./colors-panel"
import { LocationsPanel } from "./locations-panel"

/**
 * The reference data everything else is built out of.
 *
 * Families, colours and locations were all seeded by migration and editable nowhere. They share
 * a page because they share a shape — small, rarely changed, and referenced by everything —
 * and one sidebar entry is proportionate to how often anyone opens them.
 */
export const dynamic = "force-dynamic"

export default async function ReferencePage() {
    await requireCurrentAdmin()

    const [families, colors, locations, subCategories] = await Promise.all([
        FamilyService.list(),
        ColorService.list(),
        LocationService.list(),
        prisma.subCategory.findMany({
            where: { deletedAt: null },
            select: { id: true, translations: { where: { locale: "en" }, select: { name: true }, take: 1 } },
            orderBy: { order: "asc" },
        }),
    ])

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Reference data" />
            <div className="mt-8">
                <Container>
                    <Tabs defaultValue="families" className="w-full">
                        <TabsList>
                            <TabsTrigger value="families">Families ({families.length})</TabsTrigger>
                            <TabsTrigger value="colors">Colours ({colors.length})</TabsTrigger>
                            <TabsTrigger value="locations">Locations ({locations.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="families" className="mt-6">
                            <FamiliesPanel
                                families={families.map((f) => ({
                                    id: f.id,
                                    slug: f.slug,
                                    variantType: f.variantType,
                                    order: f.order,
                                    products: f._count.products,
                                    subCategory: f.subCategory.translations[0]?.name ?? f.subCategoryId,
                                    nameEn: f.translations.find((t) => t.locale === "en")?.name ?? "",
                                    nameAr: f.translations.find((t) => t.locale === "ar")?.name ?? "",
                                }))}
                                subCategories={subCategories.map((s) => ({
                                    id: s.id,
                                    name: s.translations[0]?.name ?? s.id,
                                }))}
                            />
                        </TabsContent>

                        <TabsContent value="colors" className="mt-6">
                            <ColorsPanel
                                colors={colors.map((c) => ({
                                    id: c.id,
                                    key: c.key,
                                    hex: c.hex,
                                    nameEn: c.nameEn,
                                    nameAr: c.nameAr,
                                    order: c.order,
                                    isActive: c.isActive,
                                    products: c._count.products,
                                    images: c._count.images,
                                }))}
                            />
                        </TabsContent>

                        <TabsContent value="locations" className="mt-6">
                            <LocationsPanel
                                locations={locations.map((l) => ({
                                    id: l.id,
                                    name: l.name,
                                    isDefault: l.isDefault,
                                    movements: l._count.movements,
                                    onHand: l.onHand,
                                }))}
                            />
                        </TabsContent>
                    </Tabs>
                </Container>
            </div>
        </div>
    )
}
