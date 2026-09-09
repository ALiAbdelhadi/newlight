import { resolveEffectivePrice, resolveLocale } from "@repo/database";
import { activeDiscounts } from "@/lib/discounts";
import { ProductService } from "@/lib/services/product-service";
import { stockStatusOfLevels } from "@/lib/stock";
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
        categorySlug: product.subCategory.category.translations[0]?.slug ?? "",
        subCategorySlug: product.subCategory.translations[0]?.slug ?? "",
        stock: stockStatusOfLevels(product.stockLevels),
      }
    })

    return <Products products={cards} />
}

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

    for (const categoryProducts of productsBySubCategory.values()) {
        if (selected.length >= count) break;
        const first = categoryProducts[0];
        if (first) {
            selected.push(first);
            selectedIds.add(first.id);
        }
    }

    for (const product of products) {
        if (selected.length >= count) break;
        if (selectedIds.has(product.id)) continue;
        selected.push(product);
        selectedIds.add(product.id);
    }

    return selected.slice(0, count);
}