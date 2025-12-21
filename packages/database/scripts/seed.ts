import { existsSync, readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import { CategoryType, PrismaClient, ProductColorTemp, ProductIP, AvailableColors } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config();

const __dirname = process.cwd();
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL must be defined');
}

const isAccelerate = directUrl.startsWith('prisma+');
const connectionString = isAccelerate ? (process.env.DIRECT_URL || directUrl) : directUrl;
const isUsingDirectConnection = connectionString.startsWith('postgresql://');

let prisma: PrismaClient;

if (isAccelerate && isUsingDirectConnection) {
  const adapter = new PrismaNeon({ connectionString });
  prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });
} else {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
    datasources: { db: { url: connectionString } },
  });
}

// ==================== TYPE DEFINITIONS ====================

type SupportedLanguage = "ar" | "en";

interface TranslationMap {
  [key: string]: { en: string; ar: string };
}

interface SpecificationsTable {
  [key: string]: any;
}

interface ProductData {
  productId: string;
  productName: string;
  productImages: string[];
  subCategory: string;
  price: number;
  categoryType: string;
  inventory: number;
}

interface TranslationData {
  productName?: string;
  description?: string;
  specificationsTable?: SpecificationsTable;
}

// ==================== SLUG GENERATOR ====================

class SlugGenerator {
  private static cache = new Map<string, Set<string>>();

  static generate(text: string, context: string = 'global'): string {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[^\w\s\u0600-\u06FF-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
      .replace(/-+$/, '');

    if (!this.cache.has(context)) {
      this.cache.set(context, new Set());
    }

    const existing = this.cache.get(context)!;
    let slug = base;
    let counter = 1;

    while (existing.has(slug)) {
      slug = `${base}-${counter}`;
      counter++;
    }

    existing.add(slug);
    return slug;
  }

  static clear(): void {
    this.cache.clear();
  }
}

// ==================== TRANSLATION REGISTRY ====================

class TranslationRegistry {
  private static readonly CATEGORY_MAP: TranslationMap = {
    indoor: { en: "Indoor Lighting", ar: "إضاءة داخلية" },
    outdoor: { en: "Outdoor Lighting", ar: "إضاءة خارجية" },
  };

  private static readonly SUBCATEGORY_MAP: TranslationMap = {
    cob: { en: "COB Lighting", ar: "إضاءة COB" },
    magnetic: { en: "Magnetic Track", ar: "عود مغناطيسي" },
    "magnetic-accessories": { en: "Magnetic Accessories", ar: "ملحقات مغناطيسية" },
    panel: { en: "Panel Lights", ar: "بانل لايت" },
    strip: { en: "LED Strips", ar: "شرائط LED" },
    track: { en: "Track Systems", ar: "أعواد تراك" },
    drivers: { en: "Drivers", ar: "ترانسات" },
    uplight: { en: "Uplights", ar: "إضاءة تحت الأرض" },
    downlight: { en: "Downlight", ar: "إضاءة Downlight " },
    linear: { en: "Linear", ar: "إضاءة linear " },
    cylinder: { en: "Cylinder", ar: "إضاءة Cylinder " },
    "wall-washer": { en: "Wall Washer", ar: "إضاءة Wall-washer " },
    spikes: { en: "Spike Lights", ar: "حربات" },
    "flood-light": { en: "Flood Lights", ar: "كشافات" },
    bollard: { en: "Bollard Lights", ar: "أعمدة إنارة" },
    "stairs-light": { en: "Stair Lights", ar: "درج سلم" },
    "wall-light": { en: "Wall Lights", ar: "إضاءة جدارية" },
    "high-pay": { en: "High Bay", ar: "إضاءة صناعية" },
    "drive-over": { en: "Drive Over Lights", ar: "إضاءة أرضية" },
    "track-built-in-driver": { en: "Track Built-in Drivers", ar: "ترانسات تراك" },
  };

  static getCategory(key: string, lang: SupportedLanguage): string {
    return this.CATEGORY_MAP[key]?.[lang] || key;
  }

  static getSubCategory(key: string, lang: SupportedLanguage): string {
    return this.SUBCATEGORY_MAP[key]?.[lang] || key;
  }
}

// ==================== FILE RESOLVER ====================

class FileResolver {
  private static readonly PATTERNS = {
    static: [
      'apps/www/data/products-details-static.json',
      'prisma/data/products-details-static.json',
      'data/products-details-static.json',
    ],
    ar: [
      'apps/www/data/products-details-ar.json',
      'prisma/data/products-details-ar.json',
      'data/products-details-ar.json',
    ],
    en: [
      'apps/www/data/products-details-en.json',
      'prisma/data/products-details-en.json',
      'data/products-details-en.json',
    ]
  };

  private static readonly BASE_PATHS = [
    __dirname,
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
    process.cwd(),
  ];

  static resolve(type: 'static' | 'ar' | 'en'): string | null {
    for (const base of this.BASE_PATHS) {
      for (const pattern of this.PATTERNS[type]) {
        const full = path.resolve(base, pattern);
        if (existsSync(full)) {
          console.log(`✅ Found ${type}: ${full}`);
          return full;
        }
      }
    }
    console.warn(`⚠️ Not found: ${type}`);
    return null;
  }

  static loadJson(filePath: string | null): any {
    if (!filePath || !existsSync(filePath)) return null;
    try {
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      console.error(`❌ Failed to load: ${filePath}`, error);
      return null;
    }
  }
}

// ==================== DATA PROCESSOR ====================

class DataProcessor {
  static mapColorTemp(temps: number[] | undefined): ProductColorTemp[] {
    if (!temps || !Array.isArray(temps)) return [ProductColorTemp.WARM_3000K];

    const mapped: ProductColorTemp[] = [];
    if (temps.includes(3000)) mapped.push(ProductColorTemp.WARM_3000K);
    if (temps.includes(4000)) mapped.push(ProductColorTemp.COOL_4000K);
    if (temps.includes(6500)) mapped.push(ProductColorTemp.WHITE_6500K);

    return mapped.length > 0 ? mapped : [ProductColorTemp.WARM_3000K];
  }

  static mapIP(ip: number | undefined): ProductIP {
    const map: Record<number, ProductIP> = {
      20: ProductIP.IP20,
      44: ProductIP.IP44,
      54: ProductIP.IP54,
      65: ProductIP.IP65,
      68: ProductIP.IP68,
    };
    return ip ? (map[ip] || ProductIP.IP20) : ProductIP.IP20;
  }

  static mapAvailableColors(colors: string[] | undefined): AvailableColors[] {
    if (!colors || !Array.isArray(colors)) return [];

    const colorMap: Record<string, AvailableColors> = {
      'black': AvailableColors.BLACK,
      'gray': AvailableColors.GRAY,
      'grey': AvailableColors.GRAY,
      'white': AvailableColors.WHITE,
      'gold': AvailableColors.GOLD,
      'wood': AvailableColors.WOOD,
      'أسود': AvailableColors.BLACK,
      'رمادي': AvailableColors.GRAY,
      'أبيض': AvailableColors.WHITE,
      'ذهبي': AvailableColors.GOLD,
      'خشبي': AvailableColors.WOOD,
    };

    const mapped: AvailableColors[] = [];
    for (const color of colors) {
      const normalized = color.toLowerCase().trim();
      if (colorMap[normalized]) {
        mapped.push(colorMap[normalized]);
      }
    }

    return mapped;
  }

  static extractValue(value: any): string {
    if (value === null || value === undefined || value === false) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.join(', ');
    return JSON.stringify(value);
  }

  static normalizeSpecs(specs: any): any {
    if (!specs || typeof specs !== 'object') return {};

    const normalized: any = {};
    for (const [key, value] of Object.entries(specs)) {
      const normalizedValue = value === null || value === undefined || value === false
        ? value
        : typeof value === 'string'
          ? value.trim()
          : value;
      normalized[key] = normalizedValue;
    }
    return normalized;
  }
}

// ==================== DESCRIPTION BUILDER ====================

class DescriptionBuilder {
  static build(locale: SupportedLanguage, productName: string, specs: any): string {
    if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) {
      return locale === 'ar'
        ? `${productName} - حل إضاءة احترافي مصمم لتلبية احتياجاتك.`
        : `${productName} - Professional lighting solution designed to meet your needs.`;
    }

    const isAr = locale === 'ar';

    const wattage = specs['maximum_wattage'] || specs['أقصى قوة كهربائية (w)'];
    const flux = specs['luminous_flux'] || specs['الومن'];
    const colorTemp = specs['color_Temperature'] || specs['درجة حرارة لون الاضاءة'];
    const ip = specs['IP'] || specs['درجة الحماية'];
    const maxIp = specs['maxIP'] || specs['درجة الحماية القصوي'];
    const material = specs['main_material'] || specs['مادة التصنيع'];
    const cri = specs['cri'] || specs['مؤشر تجسيد الألوان'];
    const lifeTime = specs['life_time'] || specs['العمر الافتراضي'];

    if (isAr) {
      let desc = `${productName} حل إضاءة احترافي`;

      const techSpecs = [];
      if (wattage) techSpecs.push(`قوة ${wattage} واط`);
      if (flux) techSpecs.push(`تدفق ضوئي ${flux}`);
      if (colorTemp && Array.isArray(colorTemp)) {
        const temps = colorTemp.map(t => `${t}K`).join('/');
        techSpecs.push(`درجات حرارة لونية ${temps}`);
      }

      if (techSpecs.length > 0) {
        desc += ` يتميز بـ${techSpecs.join('، ')}`;
      }

      const features = [];
      if (material) features.push(`مصنوع من ${material}`);
      if (cri) features.push(`مؤشر CRI ${cri}`);

      if (features.length > 0) {
        desc += `. ${features.join('، ')}`;
      }

      if (maxIp) {
        desc += `، مع حماية IP${maxIp} للاستخدام الداخلي والخارجي`;
      } else if (ip) {
        desc += `، مع حماية IP${ip}`;
      }

      if (lifeTime) {
        desc += `. عمر افتراضي يصل إلى ${lifeTime} ساعة`;
      }

      return desc + '.';

    } else {
      let desc = `${productName} is a professional lighting solution`;

      const techSpecs = [];
      if (wattage) techSpecs.push(`${wattage}W power`);
      if (flux) techSpecs.push(`${flux} luminous flux`);
      if (colorTemp && Array.isArray(colorTemp)) {
        const temps = colorTemp.map(t => `${t}K`).join('/');
        techSpecs.push(`${temps} color temperature`);
      }

      if (techSpecs.length > 0) {
        desc += ` featuring ${techSpecs.join(', ')}`;
      }

      const features = [];
      if (material) features.push(`${material} construction`);
      if (cri) features.push(`CRI ${cri}`);

      if (features.length > 0) {
        desc += `. Built with ${features.join(' and ')}`;
      }

      if (maxIp) {
        desc += `, rated IP${maxIp} for indoor and outdoor use`;
      } else if (ip) {
        desc += `, rated IP${ip}`;
      }

      if (lifeTime) {
        desc += `. Lifespan up to ${lifeTime} hours`;
      }

      return desc + '.';
    }
  }
}

// ==================== VARIANT DETECTOR ====================

class VariantDetector {
  static extractVariantInfo(productId: string): {
    baseProductId: string;
    variantType: string;
    variantValue: string;
  } | null {
    const cleanId = productId.trim().toLowerCase();

    // Pattern 1: wattage (5w, 6.5w, 100w)
    const wattageMatch = cleanId.match(/^(.+?)[-_](\d+(?:\.\d+)?w)$/i);
    if (wattageMatch) {
      return {
        baseProductId: wattageMatch[1],
        variantType: "wattage",
        variantValue: wattageMatch[2],
      };
    }

    // Pattern 2: length (2000mm, 3000mm)
    const lengthMatch = cleanId.match(/^(.+?)[-_](\d+mm)$/i);
    if (lengthMatch) {
      return {
        baseProductId: lengthMatch[1],
        variantType: "length",
        variantValue: lengthMatch[2],
      };
    }

    // Pattern 3: voltage (220v, 110v)
    const voltageMatch = cleanId.match(/^(.+?)[-_](\d+v)$/i);
    if (voltageMatch) {
      return {
        baseProductId: voltageMatch[1],
        variantType: "voltage",
        variantValue: voltageMatch[2],
      };
    }

    // Pattern 4: size with wattage (nl-spike-1-5w)
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
    availableColors: AvailableColors[]
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

// ==================== LOGGER ====================

class Logger {
  private static metrics = { categories: 0, subCategories: 0, products: 0, translations: 0, errors: 0 };

  static success(msg: string): void { console.log(`✅ ${msg}`); }
  static error(msg: string, err?: any): void {
    console.error(`❌ ${msg}`);
    if (err) console.error(err);
    this.metrics.errors++;
  }
  static info(msg: string): void { console.log(`ℹ️ ${msg}`); }
  static warn(msg: string): void { console.warn(`⚠️ ${msg}`); }

  static inc(metric: keyof typeof Logger.metrics): void { this.metrics[metric]++; }

  static summary(): void {
    console.log('\n📊 SUMMARY:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📂 Categories: ${this.metrics.categories}`);
    console.log(`📁 SubCategories: ${this.metrics.subCategories}`);
    console.log(`📦 Products: ${this.metrics.products}`);
    console.log(`🌐 Translations: ${this.metrics.translations}`);
    console.log(`❌ Errors: ${this.metrics.errors}`);
  }
}

// ==================== SEED ENGINE ====================

class SeedEngine {
  static async seed() {
    try {
      console.log('🚀 STARTING MULTILINGUAL SEED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      await this.clearDatabase();

      const staticPath = FileResolver.resolve('static');
      const arPath = FileResolver.resolve('ar');
      const enPath = FileResolver.resolve('en');

      if (!staticPath) throw new Error("Static file required!");

      const staticData = FileResolver.loadJson(staticPath);
      const arData = FileResolver.loadJson(arPath);
      const enData = FileResolver.loadJson(enPath);

      if (!staticData?.categories) throw new Error("Invalid static data structure");

      const translations = { ar: arData, en: enData };

      for (const [categoryType, categoryData] of Object.entries(staticData.categories)) {
        await this.processCategory(categoryType as CategoryType, categoryData as any, translations);
      }

      Logger.summary();
      Logger.success('\n🎉 SEED COMPLETED!');

    } catch (error) {
      Logger.error('💥 SEED FAILED', error);
      throw error;
    }
  }

  private static async clearDatabase() {
    Logger.info('🗑️ Clearing database...');
    await prisma.productTranslation.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.subCategoryTranslation.deleteMany({});
    await prisma.subCategory.deleteMany({});
    await prisma.categoryTranslation.deleteMany({});
    await prisma.category.deleteMany({});
    Logger.success('Database cleared');
  }

  private static async processCategory(
    categoryType: CategoryType,
    categoryData: any,
    translations: { ar: any; en: any }
  ) {
    Logger.info(`\n📂 Processing: ${categoryType}`);

    const categorySlug = SlugGenerator.generate(categoryType, 'category');

    const category = await prisma.category.create({
      data: {
        categoryType,
        slug: categorySlug,
        imageUrl: null,
        order: categoryType === 'indoor' ? 1 : 2,
        isActive: true,
      },
    });

    Logger.inc('categories');

    for (const locale of ['en', 'ar'] as SupportedLanguage[]) {
      const translatedName = TranslationRegistry.getCategory(categoryType, locale);

      await prisma.categoryTranslation.create({
        data: {
          categoryId: category.id,
          locale,
          name: translatedName,
          description: `${translatedName} products`,
        },
      });

      Logger.inc('translations');
    }

    for (const [subCategoryName, subCategoryProducts] of Object.entries(categoryData)) {
      if (subCategoryName === 'drivers' && typeof subCategoryProducts === 'object' && subCategoryProducts !== null && !Array.isArray(subCategoryProducts)) {
        for (const [nestedSubCat, nestedProducts] of Object.entries(subCategoryProducts)) {
          await this.processSubCategory(category.id, nestedSubCat, nestedProducts as any, categoryType, translations);
        }
      } else {
        await this.processSubCategory(category.id, subCategoryName, subCategoryProducts as any, categoryType, translations);
      }
    }
  }

  private static async processSubCategory(
    categoryId: string,
    subCategoryName: string,
    subCategoryProducts: any,
    categoryType: CategoryType,
    translations: { ar: any; en: any }
  ) {
    Logger.info(`  📁 SubCategory: ${subCategoryName}`);

    const subCategorySlug = SlugGenerator.generate(subCategoryName, 'subcategory');

    const subCategory = await prisma.subCategory.create({
      data: {
        categoryId,
        slug: subCategorySlug,
        imageUrl: this.getFirstImage(subCategoryProducts),
        order: 0,
        isActive: true,
      },
    });

    Logger.inc('subCategories');

    for (const locale of ['en', 'ar'] as SupportedLanguage[]) {
      const translatedName = TranslationRegistry.getSubCategory(subCategoryName, locale);

      await prisma.subCategoryTranslation.create({
        data: {
          subCategoryId: subCategory.id,
          locale,
          name: translatedName,
          description: `${translatedName} collection`,
        },
      });

      Logger.inc('translations');
    }

    const groups = Array.isArray(subCategoryProducts) ? subCategoryProducts : [subCategoryProducts];

    for (const group of groups) {
      if (Array.isArray(group)) {
        for (const item of group) {
          if (item && typeof item === 'object') {
            for (const [productId, productData] of Object.entries(item)) {
              await this.processProduct(
                productId,
                productData as any,
                subCategory.id,
                categoryType,
                subCategoryName,
                translations
              );
            }
          }
        }
      } else if (group && typeof group === 'object') {
        for (const [productId, productData] of Object.entries(group)) {
          await this.processProduct(
            productId,
            productData as any,
            subCategory.id,
            categoryType,
            subCategoryName,
            translations
          );
        }
      }
    }
  }

  private static getFirstImage(products: any): string | null {
    const groups = Array.isArray(products) ? products : [products];

    for (const group of groups) {
      if (!group) continue;

      if (Array.isArray(group)) {
        for (const item of group) {
          if (item && typeof item === 'object') {
            for (const productData of Object.values(item)) {
              const data = productData as any;
              if (data.productImages?.length) return data.productImages[0];
            }
          }
        }
      } else if (typeof group === 'object') {
        for (const productData of Object.values(group)) {
          const data = productData as any;
          if (data?.productImages?.length) return data.productImages[0];
        }
      }
    }

    return null;
  }

  private static async processProduct(
    productId: string,
    productData: ProductData,
    subCategoryId: string,
    categoryType: CategoryType,
    subCategoryName: string,
    translations: { ar: any; en: any }
  ) {
    try {
      const translationsData = {
        en: this.findProductTranslation(productId, categoryType, subCategoryName, translations.en),
        ar: this.findProductTranslation(productId, categoryType, subCategoryName, translations.ar),
      };

      const enSpecs = translationsData.en?.specificationsTable || {};
      const arSpecs = DataProcessor.normalizeSpecs(translationsData.ar?.specificationsTable);
      const productSlug = SlugGenerator.generate(productData.productName || productId, 'product');

      const voltage = DataProcessor.extractValue(enSpecs.voltage || arSpecs["المدخل"]);
      const maxWattage = typeof enSpecs.maximum_wattage === 'number' ? enSpecs.maximum_wattage :
        typeof arSpecs["أقصى قوة كهربائية (w)"] === 'number' ? arSpecs["أقصى قوة كهربائية (w)"] : null;
      const brandOfLed = DataProcessor.extractValue(enSpecs.brand_of_led || arSpecs["علامة الليد التجارية"]);
      const luminousFlux = DataProcessor.extractValue(enSpecs.luminous_flux || arSpecs["الومن"]);
      const mainMaterial = DataProcessor.extractValue(enSpecs.main_material || arSpecs["مادة التصنيع"]);
      const cri = DataProcessor.extractValue(enSpecs.cri || arSpecs["مؤشر تجسيد الألوان"]);
      const beamAngle = typeof enSpecs.beam_angle === 'number' ? enSpecs.beam_angle :
        typeof arSpecs["زاوية الإضاءة°"] === 'number' ? arSpecs["زاوية الإضاءة°"] : null;
      const productDimensions = DataProcessor.extractValue(enSpecs.product_dimensions || arSpecs["ابعاد المنتج"]);
      const holeSize = DataProcessor.extractValue(enSpecs.hole_size || arSpecs["حجم الفتحة"]);
      const powerFactor = DataProcessor.extractValue(enSpecs.power_factor || arSpecs["معامل القدرة"] || arSpecs["عامل القدرة"]);
      const colorTemperatures = DataProcessor.mapColorTemp(enSpecs.color_Temperature || arSpecs["درجة حرارة لون الاضاءة"]);
      const ipRating = DataProcessor.mapIP(enSpecs.IP || arSpecs["درجة الحماية"]);
      const maxIpRating = DataProcessor.mapIP(enSpecs.maxIP || arSpecs["درجة الحماية القصوي"]);
      const lifeTime = enSpecs.life_time || arSpecs["العمر الافتراضي"] || null;

      const availableColors = DataProcessor.mapAvailableColors(
        enSpecs.surface_color || arSpecs["الالوان المتوفره الي المنتج"]
      );

      const variantInfo = VariantDetector.extractVariantInfo(productId);
      const baseProductId = variantInfo?.baseProductId || productId;
      const variantType = variantInfo?.variantType || null;
      const variantValue = variantInfo?.variantValue || null;
      const displayOrder = variantInfo
        ? VariantDetector.getDisplayOrder(variantInfo.variantValue)
        : 0;

      const colorImageMap = VariantDetector.mapColorImages(
        productData.productImages || [],
        availableColors
      );

      const product = await prisma.product.create({
        data: {
          productId: productData.productId,
          subCategoryId,
          slug: productSlug,
          baseProductId,
          variantType,
          variantValue,
          displayOrder,
          colorImageMap: Object.keys(colorImageMap).length > 0
            ? colorImageMap
            : null,

          price: productData.price || 0,
          inventory: productData.inventory || 0,
          images: productData.productImages || [],
          voltage,
          maxWattage,
          brandOfLed,
          luminousFlux,
          mainMaterial,
          cri,
          beamAngle,
          productDimensions,
          holeSize,
          powerFactor,
          colorTemperatures,
          ipRating,
          maxIpRating,
          lifeTime,
          availableColors,
          isActive: true,
          isFeatured: false,
          order: 0,
        },
      });

      Logger.inc('products');

      for (const locale of ['en', 'ar'] as SupportedLanguage[]) {
        const localeData = translationsData[locale];
        const specs = locale === 'en' ? enSpecs : arSpecs;

        const translatedName = localeData?.productName || productData.productName || productId;
        const description = DescriptionBuilder.build(locale, translatedName, specs);

        await prisma.productTranslation.create({
          data: {
            productId: product.id,
            locale,
            name: translatedName,
            description,
            specifications: specs,
          },
        });

        Logger.inc('translations');
      }

      console.log(`    ✅ Product: ${productId}`);

    } catch (error) {
      Logger.error(`Failed: ${productId}`, error);
    }
  }

  private static findProductTranslation(
    productId: string,
    categoryType: string,
    subCategoryName: string,
    translationData: any
  ): TranslationData | null {
    const aliasMap: Record<string, string[]> = {
      'track-built-in-driver': ['track-built-in'],
      'track-built-in': ['track-built-in-driver'],
    };

    const candidateKeys = [subCategoryName, ...(aliasMap[subCategoryName] || [])];

    for (const key of candidateKeys) {
      const subCategoryProducts = translationData?.categories?.[categoryType]?.[key];
      if (!subCategoryProducts) continue;

      const groups = Array.isArray(subCategoryProducts) ? subCategoryProducts : [subCategoryProducts];

      for (const group of groups) {
        if (!group) continue;

        if (Array.isArray(group)) {
          for (const item of group) {
            if (item && typeof item === 'object' && item[productId]) {
              if (key !== subCategoryName) {
                Logger.warn(`Using alias "${key}" for subcategory "${subCategoryName}"`);
              }
              return item[productId];
            }
          }
        } else if (typeof group === 'object' && group[productId]) {
          if (key !== subCategoryName) {
            Logger.warn(`Using alias "${key}" for subcategory "${subCategoryName}"`);
          }
          return group[productId];
        }
      }
    }

    Logger.warn(`No translation found for product "${productId}" in subcategory "${subCategoryName}" (${categoryType})`);
    return null;
  }
}

// ==================== MAIN ====================

async function main() {
  const startTime = Date.now();

  try {
    console.log('🔌 Connecting...');
    await prisma.$connect();
    Logger.success('Connected');

    await SeedEngine.seed();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️ Total time: ${duration}s`);

  } catch (error) {
    console.error('💥 Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main();