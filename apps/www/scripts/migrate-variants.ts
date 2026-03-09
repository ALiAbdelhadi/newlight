import { prisma, Prisma } from "@repo/database";

class VariantDetector {
    static extractVariantInfo(productId: string): {
        baseProductId: string;
        variantType: string;
        variantValue: string;
    } | null {
        const cleanId = productId.trim().toLowerCase();

        const wattageMatch = cleanId.match(/^(.+?)[-_](\d+(?:\.\d+)?w)$/i);
        if (wattageMatch) {
            return {
                baseProductId: wattageMatch[1],
                variantType: "wattage",
                variantValue: wattageMatch[2],
            };
        }

        const lengthMatch = cleanId.match(/^(.+?)[-_](\d+mm)$/i);
        if (lengthMatch) {
            return {
                baseProductId: lengthMatch[1],
                variantType: "length",
                variantValue: lengthMatch[2],
            };
        }

        const voltageMatch = cleanId.match(/^(.+?)[-_](\d+v)$/i);
        if (voltageMatch) {
            return {
                baseProductId: voltageMatch[1],
                variantType: "voltage",
                variantValue: voltageMatch[2],
            };
        }

        const sizeWithWattageMatch = cleanId.match(/^(.+?)[-_](\d+)[-_](\d+(?:\.\d+)?w)$/i);
        if (sizeWithWattageMatch) {
            return {
                baseProductId: `${sizeWithWattageMatch[1]}-${sizeWithWattageMatch[2]}`,
                variantType: "wattage",
                variantValue: sizeWithWattageMatch[3],
            };
        }

        return null;
    }

    static getDisplayOrder(variantValue: string): number {
        const numMatch = variantValue.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
            return parseFloat(numMatch[1]);
        }
        return 0;
    }

    static mapColorImages(
        images: string[],
        availableColors: string[]
    ): Record<string, string[]> {
        const colorMap: Record<string, string[]> = {};

        if (availableColors.length <= 1) {
            return {};
        }

        for (const color of availableColors) {
            const colorLower = color.toLowerCase();
            const matchingImages = images.filter(img =>
                img.toLowerCase().includes(colorLower) ||
                img.toLowerCase().includes(this.getColorAlias(color))
            );

            if (matchingImages.length > 0) {
                colorMap[color] = matchingImages;
            }
        }

        return colorMap;
    }

    private static getColorAlias(color: string): string {
        const aliases: Record<string, string> = {
            BLACK: 'black',
            GRAY: 'gray|grey',
            WHITE: 'white',
            GOLD: 'gold',
            WOOD: 'wood',
        };
        return aliases[color] || color.toLowerCase();
    }
}

async function main() {
    console.log('🚀 بدء Migration للـ Variants...\n');

    // الحصول على جميع المنتجات
    const products = await prisma.product.findMany({
        select: {
            id: true,
            productId: true,
            images: true,
            availableColors: true,
        },
    });

    console.log(`📦 تم العثور على ${products.length} منتج\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
        try {
            // استخراج معلومات الـ variant
            const variantInfo = VariantDetector.extractVariantInfo(product.productId);

            if (!variantInfo) {
                console.log(`⏭️  تخطي: ${product.productId} (ليس variant)`);
                skipped++;
                continue;
            }

            const { baseProductId, variantType, variantValue } = variantInfo;
            const displayOrder = VariantDetector.getDisplayOrder(variantValue);

            // إنشاء خريطة الصور
            const colorImageMap = VariantDetector.mapColorImages(
                product.images,
                product.availableColors
            );

            // تحديث المنتج
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    baseProductId,
                    variantType,
                    variantValue,
                    displayOrder,
                    colorImageMap: Object.keys(colorImageMap).length > 0 ? colorImageMap : (Prisma.JsonNull as any),
                },
            });

            console.log(`✅ تم تحديث: ${product.productId} => base: ${baseProductId}, type: ${variantType}, value: ${variantValue}`);
            updated++;

        } catch (error) {
            console.error(`❌ خطأ في ${product.productId}:`, error);
            errors++;
        }
    }

    console.log('\n📊 الملخص:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ تم التحديث: ${updated}`);
    console.log(`⏭️  تم التخطي: ${skipped}`);
    console.log(`❌ أخطاء: ${errors}`);
    console.log(`📦 الإجمالي: ${products.length}`);

    console.log('\n🎉 انتهى Migration!');
}

main()
    .catch((error) => {
        console.error('💥 فشل Migration:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });