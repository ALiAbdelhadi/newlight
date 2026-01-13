"use server";
import { prisma, ProductColorTemp } from "@repo/database";


export const changeProductColorTemp = async ({
    productId,
    newColorTemp,
}: {
    productId: string;
    newColorTemp: ProductColorTemp;
}) => {
    await prisma.product.update({
        where: { productId },
        data: { colorTemperatures: [newColorTemp] },
    });
};
