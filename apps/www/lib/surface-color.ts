"use server";
import { prisma, AvailableColors } from "@repo/database";

export const changeProductAvailableColor = async ({
    productId,
    newAvailableColor,
}: {
    productId: string;
    newAvailableColor: AvailableColors;
}) => {
    await prisma.product.update({
        where: { productId },
        data: { availableColors: [newAvailableColor] },
    });
};