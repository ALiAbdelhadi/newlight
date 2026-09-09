import { prisma } from "@repo/database"

import { requireCurrentAdmin } from "@/lib/auth"
import { DiscountService } from "@/lib/services/discount-service"
import { PageBody, PageHeader } from "@/components/page"
import { DiscountsClient } from "./discounts-client"

/**
 * §13.2 — discounts.
 *
 * The sibling of bulk repricing, and deliberately a separate surface rather than a fifth
 * formula on it. Repricing answers "this product now costs more"; a discount answers "this
 * family costs less until the 15th". Folding the second into the first would put a fortnight
 * of temporary numbers into every product's permanent price history, and leave nothing to
 * restore when the fortnight ended.
 *
 * The taxonomy is loaded whole because the scope picker offers all four levels and the
 * catalogue is 189 products — one query beats four round trips as the operator changes their
 * mind about what they are discounting.
 */
export const dynamic = "force-dynamic"

export default async function DiscountsPage() {
    await requireCurrentAdmin()

    const [discounts, categories, subCategories, families, products] = await Promise.all([
        DiscountService.list(),
        prisma.category.findMany({
            where: { deletedAt: null },
            select: { id: true, translations: { where: { locale: "en" }, select: { name: true }, take: 1 } },
            orderBy: { order: "asc" },
        }),
        prisma.subCategory.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                categoryId: true,
                translations: { where: { locale: "en" }, select: { name: true }, take: 1 },
                _count: { select: { products: true } },
            },
            orderBy: { order: "asc" },
        }),
        prisma.productFamily.findMany({
            where: { deletedAt: null },
            select: { id: true, slug: true, subCategoryId: true, _count: { select: { products: true } } },
            orderBy: { slug: "asc" },
        }),
        /*
         * Every live product, for the picker. The repricer asks for "product ids, comma
         * separated", which is a field nobody can fill in without a database — an operator
         * knows the SKU on the box, not a cuid. 189 rows of {id, sku, name} is a few
         * kilobytes, and it is the difference between "discount this product" being usable
         * and being theoretical.
         */
        prisma.product.findMany({
            where: { deletedAt: null, isActive: true },
            select: {
                id: true,
                productId: true,
                subCategoryId: true,
                familyId: true,
                translations: { where: { locale: "en" }, select: { name: true }, take: 1 },
            },
            orderBy: { productId: "asc" },
        }),
    ])

    return (
        <>
            <PageHeader
                title="Discounts"
                description="A discount is a period, not a price change. The product keeps its price, sells for less while the discount runs, and goes back on its own when it ends — nothing has to be undone."
            />

            <PageBody>
                <DiscountsClient
                    discounts={discounts}
                    categories={categories.map((category) => ({
                        id: category.id,
                        name: category.translations[0]?.name ?? category.id,
                    }))}
                    subCategories={subCategories.map((subCategory) => ({
                        id: subCategory.id,
                        categoryId: subCategory.categoryId,
                        name: subCategory.translations[0]?.name ?? subCategory.id,
                        productCount: subCategory._count.products,
                    }))}
                    families={families.map((family) => ({
                        id: family.id,
                        subCategoryId: family.subCategoryId,
                        name: family.slug,
                        productCount: family._count.products,
                    }))}
                    products={products.map((product) => ({
                        id: product.id,
                        sku: product.productId,
                        name: product.translations[0]?.name ?? product.productId,
                    }))}
                />
            </PageBody>
        </>
    )
}
