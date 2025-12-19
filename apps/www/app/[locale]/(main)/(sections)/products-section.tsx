import { getProductsByIds } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { Products } from "./products";


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
    const currentLocale = await getLocale();
    const allProducts = await getProductsByIds(FEATURED_PRODUCT_IDS, currentLocale);
    const products = selectRandomProductsFromDifferentSubCategories(allProducts, 8);
    
    return (
        <>
            <Products products={products} />
        </>
    )
}


function selectRandomProductsFromDifferentSubCategories<T extends { id: string; subCategory: { slug: string } }>(
    products: T[],
    count: number
): T[] {
    if (products.length <= count) {
        return products;
    }

    const productsBySubCategory = new Map<string, T[]>();
    products.forEach(product => {
        const subCategorySlug = product.subCategory.slug;
        if (!productsBySubCategory.has(subCategorySlug)) {
            productsBySubCategory.set(subCategorySlug, []);
        }
        productsBySubCategory.get(subCategorySlug)!.push(product);
    });

    const selected: T[] = [];
    const selectedIds = new Set<string>();
    const subCategorySlugs = Array.from(productsBySubCategory.keys());

    for (const subCategorySlug of subCategorySlugs) {
        if (selected.length >= count) break;
        
        const categoryProducts = productsBySubCategory.get(subCategorySlug)!;
        if (categoryProducts.length > 0) {
            const randomIndex = Math.floor(Math.random() * categoryProducts.length);
            const selectedProduct = categoryProducts[randomIndex];
            selected.push(selectedProduct);
            selectedIds.add(selectedProduct.id);
        }
    }

    while (selected.length < count && products.length > selected.length) {
        const remainingProducts = products.filter(p => !selectedIds.has(p.id));
        if (remainingProducts.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * remainingProducts.length);
        const selectedProduct = remainingProducts[randomIndex];
        selected.push(selectedProduct);
        selectedIds.add(selectedProduct.id);
    }

    return selected.slice(0, count);
}