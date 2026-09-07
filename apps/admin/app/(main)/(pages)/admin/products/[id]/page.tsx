import { notFound } from "next/navigation"
import { prisma, serializeMoney } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { TranslationService } from "@/lib/services/translation-service"
import { CatalogService } from "@/lib/services/catalog-service"
import { InventoryService } from "@/lib/services/inventory-service"
import { SpecService } from "@/lib/services/spec-service"
import { MediaService } from "@/lib/services/media-service"
import { PricingService } from "@/lib/services/pricing-service"
import { AuditService } from "@/lib/services/audit-service"
import { ProductWorkbench } from "./product-workbench"

/**
 * §13.2 item 8: this route did not exist, while the products table linked to it — every
 * "View Product" was a 404.
 *
 * It is a workbench rather than a record view. The three things the owner was doing in psql
 * — repricing, correcting stock, and writing Arabic — are the three panels, under one header
 * that says what the product currently IS.
 */
export const dynamic = "force-dynamic"

const TABS = ["translations", "images", "inventory", "price", "specs", "settings"] as const
type Tab = (typeof TABS)[number]

export default async function ProductDetail({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tab?: string }>
}) {
    await requireCurrentAdmin()
    const { id } = await params
    const { tab } = await searchParams
    // An unrecognised ?tab= falls back rather than rendering an empty panel.
    const initialTab: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : "translations"

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            images: { orderBy: { order: "asc" } },
            availableColors: { include: { color: true }, orderBy: { order: "asc" } },
            stockLevels: true,
            family: { include: { translations: { where: { locale: "en" }, take: 1 } } },
            subCategory: {
                include: {
                    translations: { where: { locale: "en" }, take: 1 },
                    category: { include: { translations: { where: { locale: "en" }, take: 1 } } },
                },
            },
            slugHistory: { orderBy: { createdAt: "desc" } },
            _count: { select: { orderItems: true, cartItems: true, configurations: true } },
        },
    })

    if (!product) notFound()

    const [translations, blockers, movements, priceHistory, specs, media, audit] = await Promise.all([
        TranslationService.forProduct(product.id),
        CatalogService.deletionBlockers(product.id),
        InventoryService.history(product.id, 50),
        PricingService.priceHistory(product.id),
        // From the DEFINITIONS, not from the rows that happen to exist — a product missing a
        // required spec must still show it, or it can never be filled in.
        SpecService.forProduct(product.id),
        MediaService.forProduct(product.id),
        // The rail is part of the record architecture (§12), not a later phase. The index
        // @@index([entity, entityId, createdAt]) exists for exactly this read.
        AuditService.forEntity("Product", product.id, 12),
    ])

    const onHand = product.stockLevels.reduce((sum, l) => sum + l.onHand, 0)
    const reserved = product.stockLevels.reduce((sum, l) => sum + l.reserved, 0)

    const categoryPath = [
        product.subCategory?.category?.translations[0]?.name,
        product.subCategory?.translations[0]?.name,
        product.family?.translations[0]?.name ?? product.family?.slug,
    ]
        .filter(Boolean)
        .join(" › ")

    return (
        <ProductWorkbench
            initialTab={initialTab}
            productId={product.id}
            sku={product.productId}
            slug={product.slug}
            isActive={product.isActive}
            isArchived={product.deletedAt !== null}
            price={serializeMoney(product.price)}
            averageCost={product.averageCost ? serializeMoney(product.averageCost) : null}
            onHand={onHand}
            reserved={reserved}
            translations={translations}
            blockers={blockers}
            movements={movements.map((m) => ({
                id: m.id,
                type: m.type,
                quantity: m.quantity,
                reason: m.reason,
                unitCost: m.unitCost ? serializeMoney(m.unitCost) : null,
                actorType: m.actorType,
                createdAt: m.createdAt.toISOString(),
            }))}
            priceHistory={priceHistory}
            specs={specs}
            images={media.images.map((image) => ({
                id: image.id,
                url: image.url,
                publicId: image.publicId,
                order: image.order,
                colorId: image.colorId,
                colorKey: image.color?.key ?? null,
                width: image.width,
                height: image.height,
                altEn: image.altEn,
                altAr: image.altAr,
            }))}
            colors={media.colors}
            offeredColorIds={product.availableColors.map((a) => a.colorId)}
            slugHistory={product.slugHistory.map((h) => h.slug)}
            categoryPath={categoryPath}
            variantValue={product.variantValue}
            orderLineCount={product._count.orderItems}
            createdAt={product.createdAt.toISOString()}
            updatedAt={product.updatedAt.toISOString()}
            audit={audit.map((row) => ({
                id: row.id,
                action: row.action,
                actorEmail: row.actorEmail,
                actorType: row.actorType,
                createdAt: row.createdAt,
            }))}
        />
    )
}
