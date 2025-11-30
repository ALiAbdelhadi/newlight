"use server";
import { prisma } from "@repo/database";

export async function searchProducts(searchItem: string) {
    const products = await prisma.product.findMany({
        where: {
            OR: [
                { productName: { contains: searchItem, mode: "insensitive" } },
                { brand: { contains: searchItem, mode: "insensitive" } },
                { sectionType: { contains: searchItem, mode: "insensitive" } },
            ],
        },
        select: {
            id: true,
            productId: true,
            productName: true,
            price: true,
            brand: true,
            sectionType: true,
            spotlightType: true,
            productImages: true,
            discount: true,
        },
        take: 10,
    });
    return products;
}
