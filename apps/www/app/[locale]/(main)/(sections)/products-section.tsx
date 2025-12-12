import { getAllProducts } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { Products } from "./products";

export default async function productsSection() {
    const currentLocale = await getLocale();
    const products = await getAllProducts(currentLocale, 8);
    return (
        <>
            <Products products={products} />
        </>
    )
}