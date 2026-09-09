import { resolveEffectivePrice, resolveLocale } from "@repo/database";
import { activeDiscounts } from "@/lib/discounts";
import { ProductService } from "@/lib/services/product-service";
import { getLocale } from "next-intl/server";
import { Products, type UIProduct } from "./products";


const FEATURED_PRODUCT_IDS = [
    "nl-r-ds-5w",
    "nl-a603-6w",
    "nl-e1030",
    "nl-60*60-led",
    "nl-strip-2835-19w",
    "nl-l1001-2000mm",
    "nl-dv-102-100w",
    "nl-bollard-1",
    "nl-drive-over-1",
    "nl-floodlight-150w",
    "nl-high-pay-100w",
    "nl-spike-1-5w"
];

export default async function productsSection() {
    const currentLocale = resolveLocale(await getLocale());
    const allProducts = await ProductService.getProductsByIds(FEATURED_PRODUCT_IDS, currentLocale);
    const products = selectProductsFromDifferentSubCategories(allProducts, 8);

    // Mapped HERE, on the server, because `price` is a Decimal and a Decimal cannot cross into
    // a Client Component (§4, ADR 0001). It used to be handed over raw and serialised on the
    // far side, which React rejected 231 times per page load.
    // One load for the whole strip, and the same resolver the checkout uses (§13.2).
    const discounts = await activeDiscounts();

    const cards: UIProduct[] = products.map((product) => {
      const priced = resolveEffectivePrice(product.price, product, discounts)
      return {
        id: product.id,
        image: product.images[0]?.url ?? "/lighting-product.jpg",
        title: product.translations[0]?.name || product.productId,
        category: product.subCategory.translations[0]?.name ?? "",
        price: priced.effective,
        basePrice: priced.base,
        discountPercent: priced.percentOff,
        badge: product.isFeatured ? "Featured" : undefined,
        productId: product.productId,
        slug: product.slug,
        // Per-locale slugs off the translation rows (§9.2) — the entity has none.
        categorySlug: product.subCategory.category.translations[0]?.slug ?? "",
        subCategorySlug: product.subCategory.translations[0]?.slug ?? "",
      }
    })

    return <Products products={cards} />
}


/**
 * One product per sub-category, up to `count`, and DETERMINISTIC.
 *
 * This picked at random with `Math.random()` — inside a server component. Two renders of the
 * same request could therefore choose different products, which is both a hydration mismatch
 * and a home page that reshuffles when nothing changed. The order the SKUs are listed in above
 * is a real editorial decision; using it is better than re-deciding on every request.
 */
function selectProductsFromDifferentSubCategories<T extends { id: string; subCategoryId: string }>(
    products: T[],
    count: number
): T[] {
    if (products.length <= count) {
        return products;
    }

    const productsBySubCategory = new Map<string, T[]>();
    products.forEach(product => {
        const subCategorySlug = product.subCategoryId;
        if (!productsBySubCategory.has(subCategorySlug)) {
            productsBySubCategory.set(subCategorySlug, []);
        }
        productsBySubCategory.get(subCategorySlug)!.push(product);
    });

    const selected: T[] = [];
    const selectedIds = new Set<string>();

    // First pass: the first product of each sub-category, in the order the SKUs were listed.
    for (const categoryProducts of productsBySubCategory.values()) {
        if (selected.length >= count) break;
        const first = categoryProducts[0];
        if (first) {
            selected.push(first);
            selectedIds.add(first.id);
        }
    }

    // Second pass: fill any remaining slots, still in listed order.
    for (const product of products) {
        if (selected.length >= count) break;
        if (selectedIds.has(product.id)) continue;
        selected.push(product);
        selectedIds.add(product.id);
    }

    return selected.slice(0, count);
}