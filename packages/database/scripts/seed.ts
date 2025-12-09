import { existsSync, readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import { CategoryType, PrismaClient, ProductColorTemp, ProductIP } from "../prisma/client/client";
import { PrismaNeon } from '@prisma/adapter-neon';

// Load environment variables (root .env if running from package subfolder)
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config();

// Use process cwd as base to stay compatible with CommonJS compilation (no import.meta)
const __dirname = process.cwd();

// Use DIRECT_URL for seeding (direct database connection, not Accelerate)
// This ensures writes are committed immediately
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL must be defined in environment variables');
}

// Check if using Prisma Accelerate (prisma+postgres://) - if so, use DIRECT_URL
const isAccelerate = directUrl.startsWith('prisma+');
const connectionString = isAccelerate ? (process.env.DIRECT_URL || directUrl) : directUrl;
const isUsingDirectConnection = connectionString.startsWith('postgresql://');

let prisma: PrismaClient;

if (isAccelerate && isUsingDirectConnection) {
  // Use Neon adapter for direct connection
  const adapter = new PrismaNeon({ connectionString });
  prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });
} else {
  // Use standard PrismaClient (for Accelerate or direct postgresql)
  prisma = new PrismaClient({
    log: ['warn', 'error'],
    datasources: {
      db: {
        url: connectionString,
      },
    },
  });
}

// ==================== TYPE DEFINITIONS ====================

type SupportedLanguage = "ar" | "en";

interface TranslationMap {
  [key: string]: {
    en: string;
    ar: string;
  };
}

interface StaticProductData {
  productId: string;
  productName: string;
  productImages: string[];
  subCategory: string;
  price: number;
  categoryType: string;
  inventory: number;
}

interface SpecificationsTable {
  voltage?: string | string[];
  maximum_wattage?: number | string;
  brand_of_led?: string;
  luminous_flux?: string;
  main_material?: string | boolean;
  cri?: string;
  beam_angle?: number | boolean;
  product_dimensions?: string;
  hole_size?: string;
  power_factor?: string;
  color_Temperature?: number[];
  IP?: number;
  maxIP?: number;
  life_time?: number;
  surface_color?: string[];
}

// ==================== SLUG GENERATOR ====================

class SmartSlugGenerator {
  private static readonly SLUG_CACHE = new Map<string, Set<string>>();

  static generateUniqueSlug(text: string, context: string = 'global'): string {
    const baseSlug = this.sanitizeText(text);
    const cacheKey = context;

    if (!this.SLUG_CACHE.has(cacheKey)) {
      this.SLUG_CACHE.set(cacheKey, new Set());
    }

    const existingSlugs = this.SLUG_CACHE.get(cacheKey)!;
    let finalSlug = baseSlug;
    let counter = 1;

    while (existingSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    existingSlugs.add(finalSlug);
    return finalSlug;
  }

  private static sanitizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[^\w\s\u0600-\u06FF-]/g, '')
      .replace(/[\s_\u00A0]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
      .replace(/-+$/, '');
  }

  static clearCache(): void {
    this.SLUG_CACHE.clear();
  }
}

// ==================== TRANSLATION REGISTRY ====================

class TranslationRegistry {
  private static readonly CATEGORY_TRANSLATIONS: TranslationMap = {
    indoor: { en: "Indoor Lighting", ar: "إضاءة داخلية" },
    outdoor: { en: "Outdoor Lighting", ar: "إضاءة خارجية" },
  };

  private static readonly SUBCATEGORY_TRANSLATIONS: TranslationMap = {
    cob: { en: "COB Lighting", ar: "إضاءة COB" },
    magnetic: { en: "Magnetic Track", ar: "مسار مغناطيسي" },
    "magnetic-accessories": { en: "Magnetic Accessories", ar: "ملحقات مغناطيسية" },
    panel: { en: "Panel Lights", ar: "إضاءة بانل" },
    strip: { en: "LED Strips", ar: "شرائط LED" },
    track: { en: "Track Systems", ar: "أنظمة المسار" },
    drivers: { en: "Drivers", ar: "المحركات" },
    uplight: { en: "Uplights", ar: "إضاءة علوية" },
    spikes: { en: "Spike Lights", ar: "إضاءة حربات" },
    "flood-light": { en: "Flood Lights", ar: "كشافات" },
    bollard: { en: "Bollard Lights", ar: "إضاءة أعمدة" },
    "stairs-light": { en: "Stair Lights", ar: "إضاءة سلالم" },
    "wall-light": { en: "Wall Lights", ar: "إضاءة جدارية" },
    "high-pay": { en: "High Bay", ar: "إضاءة علوية صناعية" },
    "drive-over": { en: "Drive Over Lights", ar: "إضاءة أرضية" },
  };

  static getCategoryTranslation(category: string, language: SupportedLanguage): string {
    return this.CATEGORY_TRANSLATIONS[category]?.[language] || category;
  }

  static getSubCategoryTranslation(subCategory: string, language: SupportedLanguage): string {
    return this.SUBCATEGORY_TRANSLATIONS[subCategory]?.[language] || subCategory;
  }
}

// ==================== FILE RESOLVER ====================

class FileResolver {
  private static readonly SEARCH_PATTERNS = {
    static: [
      'apps/www/data/products-details-static.json',
      'prisma/data/products-details-static.json',
      'data/products-details-static.json',
      'product-details.static.json',
    ],
    arabic: [
      'apps/www/data/products-details-ar.json',
      'prisma/data/products-details-ar.json',
      'data/products-details-ar.json',
      'product-details-ar.json',
    ],
    english: [
      'apps/www/data/products-details-en.json',
      'prisma/data/products-details-en.json',
      'data/products-details-en.json',
      'product-details-en.json',
    ]
  };

  private static readonly BASE_PATHS = [
    __dirname,
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
    process.cwd(),
  ];

  static resolveFile(fileType: keyof typeof this.SEARCH_PATTERNS): string | null {
    const patterns = this.SEARCH_PATTERNS[fileType];

    for (const basePath of this.BASE_PATHS) {
      for (const pattern of patterns) {
        const fullPath = path.resolve(basePath, pattern);
        if (existsSync(fullPath)) {
          console.log(`✅ Found ${fileType} file: ${fullPath}`);
          return fullPath;
        }
      }
    }

    console.warn(`⚠️ ${fileType} file not found`);
    return null;
  }

  static loadJson(filePath: string | null): any {
    if (!filePath || !existsSync(filePath)) return null;

    try {
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      console.error(`❌ Failed to load JSON file: ${filePath}`, error);
      return null;
    }
  }
}

// ==================== DATA PROCESSOR ====================

class DataProcessor {
  static mapColorTemperature(temps: number[] | undefined): ProductColorTemp[] {
    if (!temps || !Array.isArray(temps)) return [];

    const mapped: ProductColorTemp[] = [];
    temps.forEach(temp => {
      if (temp === 3000) mapped.push(ProductColorTemp.WARM_3000K);
      if (temp === 4000) mapped.push(ProductColorTemp.COOL_4000K);
      if (temp === 6500) mapped.push(ProductColorTemp.WHITE_6500K);
    });

    return mapped.length > 0 ? mapped : [ProductColorTemp.WARM_3000K];
  }

  static mapIPRating(ip: number | undefined): ProductIP {
    if (!ip) return ProductIP.IP20;

    switch (ip) {
      case 20: return ProductIP.IP20;
      case 44: return ProductIP.IP44;
      case 54: return ProductIP.IP54;
      case 65: return ProductIP.IP65;
      case 68: return ProductIP.IP68;
      default: return ProductIP.IP20;
    }
  }

  static mapMaxIPRating(maxIp: number | undefined): ProductIP | null {
    if (!maxIp) return null;

    switch (maxIp) {
      case 44: return ProductIP.IP44;
      case 54: return ProductIP.IP54;
      case 65: return ProductIP.IP65;
      case 68: return ProductIP.IP68;
      default: return null;
    }
  }

  static extractSpecValue(value: any): string {
    if (value === null || value === undefined || value === false) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.join(', ');
    return JSON.stringify(value);
  }
}

// ==================== LOGGER ====================

class Logger {
  private static metrics = {
    categories: 0,
    subCategories: 0,
    products: 0,
    translations: 0,
    errors: 0,
  };

  static success(message: string): void {
    console.log(`✅ ${message}`);
  }

  static error(message: string, error?: any): void {
    console.error(`❌ ${message}`);
    if (error) console.error(error);
    this.metrics.errors++;
  }

  static info(message: string): void {
    console.log(`ℹ️ ${message}`);
  }

  static incrementMetric(metric: keyof typeof this.metrics): void {
    this.metrics[metric]++;
  }

  static displaySummary(): void {
    console.log('\n📊 IMPORT SUMMARY:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📂 Categories: ${this.metrics.categories}`);
    console.log(`📁 SubCategories: ${this.metrics.subCategories}`);
    console.log(`📦 Products: ${this.metrics.products}`);
    console.log(`🌐 Translations: ${this.metrics.translations}`);
    console.log(`❌ Errors: ${this.metrics.errors}`);
  }
}

// ==================== MAIN SEED ENGINE ====================

class SeedEngine {
  private static async loadDataFiles() {
    const staticPath = FileResolver.resolveFile('static');
    const arabicPath = FileResolver.resolveFile('arabic');
    const englishPath = FileResolver.resolveFile('english');

    if (!staticPath) {
      throw new Error("❌ Static data file is required!");
    }

    const staticData = FileResolver.loadJson(staticPath);
    const arabicData = FileResolver.loadJson(arabicPath);
    const englishData = FileResolver.loadJson(englishPath);

    return { staticData, arabicData, englishData };
  }

  static async seedDatabase() {
    try {
      console.log('🚀 STARTING DATABASE SEED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Clear existing data
      await this.clearDatabase();

      // Load data files
      const { staticData, arabicData, englishData } = await this.loadDataFiles();

      if (!staticData?.categories) {
        throw new Error("Invalid static data structure");
      }

      // Process all categories and products
      for (const [categoryType, categoryData] of Object.entries(staticData.categories)) {
        await this.processCategoryType(
          categoryType as CategoryType,
          categoryData as any,
          arabicData,
          englishData
        );
      }

      Logger.displaySummary();
      Logger.success('\n🎉 DATABASE SEED COMPLETED SUCCESSFULLY!');

    } catch (error) {
      Logger.error('💥 SEED FAILED', error);
      throw error;
    }
  }

  private static async clearDatabase() {
    Logger.info('🗑️ Clearing existing data...');

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

  private static async processCategoryType(
    categoryType: CategoryType,
    categoryData: any,
    arabicData: any,
    englishData: any
  ) {
    Logger.info(`\n📂 Processing category: ${categoryType}`);

    // Create Category
    const categorySlug = SmartSlugGenerator.generateUniqueSlug(categoryType, 'category');

    const category = await prisma.category.create({
      data: {
        categoryType,
        slug: categorySlug,
        imageUrl: null,
        order: categoryType === 'indoor' ? 1 : 2,
        isActive: true,
      },
    });

    Logger.incrementMetric('categories');

    // Create Category Translations
    for (const locale of ['en', 'ar'] as SupportedLanguage[]) {
      const translatedName = TranslationRegistry.getCategoryTranslation(categoryType, locale);

      await prisma.categoryTranslation.create({
        data: {
          categoryId: category.id,
          locale,
          name: translatedName,
          description: `${translatedName} products`,
        },
      });

      Logger.incrementMetric('translations');
    }

    // Process SubCategories
    for (const [subCategoryName, subCategoryProducts] of Object.entries(categoryData)) {
      // Handle special case: drivers has nested subcategories
      // Structure: { "drivers": { "track-built-in-driver": [...] } }
      if (subCategoryName === 'drivers' && subCategoryProducts && typeof subCategoryProducts === 'object' && !Array.isArray(subCategoryProducts)) {
        // Process each nested subcategory within drivers
        for (const [nestedSubCategoryName, nestedProducts] of Object.entries(subCategoryProducts)) {
          await this.processSubCategory(
            category.id,
            nestedSubCategoryName,
            nestedProducts as any,
            categoryType,
            arabicData,
            englishData
          );
        }
      } else {
        // Normal subcategory processing
        await this.processSubCategory(
          category.id,
          subCategoryName,
          subCategoryProducts as any,
          categoryType,
          arabicData,
          englishData
        );
      }
    }
  }

  private static async processSubCategory(
    categoryId: string,
    subCategoryName: string,
    subCategoryProducts: any,
    categoryType: CategoryType,
    arabicData: any,
    englishData: any
  ) {
    Logger.info(`  📁 Processing subcategory: ${subCategoryName}`);

    const subCategorySlug = SmartSlugGenerator.generateUniqueSlug(subCategoryName, 'subcategory');

    const subCategory = await prisma.subCategory.create({
      data: {
        categoryId,
        slug: subCategorySlug,
        imageUrl: this.getFirstProductImage(subCategoryProducts),
        order: 0,
        isActive: true,
      },
    });

    Logger.incrementMetric('subCategories');

    // Create SubCategory Translations
    for (const locale of ['en', 'ar'] as SupportedLanguage[]) {
      const translatedName = TranslationRegistry.getSubCategoryTranslation(subCategoryName, locale);

      await prisma.subCategoryTranslation.create({
        data: {
          subCategoryId: subCategory.id,
          locale,
          name: translatedName,
          description: `${translatedName} collection`,
        },
      });

      Logger.incrementMetric('translations');
    }

    // Normalize and process Products (handles both arrays and objects)
    const groups = Array.isArray(subCategoryProducts)
      ? subCategoryProducts
      : [subCategoryProducts];

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
                arabicData,
                englishData
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
            arabicData,
            englishData
          );
        }
      }
    }
  }

  private static getFirstProductImage(products: any): string | null {
    const groups = Array.isArray(products) ? products : [products];

    for (const group of groups) {
      if (!group) continue;

      if (Array.isArray(group)) {
        for (const item of group) {
          if (item && typeof item === 'object') {
            for (const productData of Object.values(item)) {
              const data = productData as any;
              if (data.productImages && data.productImages.length > 0) {
                return data.productImages[0];
              }
            }
          }
        }
      } else if (typeof group === 'object') {
        for (const productData of Object.values(group)) {
          const data = productData as any;
          if (data?.productImages?.length) {
            return data.productImages[0];
          }
        }
      }
    }

    return null;
  }

  private static async processProduct(
    productId: string,
    productData: StaticProductData,
    subCategoryId: string,
    categoryType: CategoryType,
    subCategoryName: string,
    arabicData: any,
    englishData: any
  ) {
    try {
      // Find specifications from translation files
      const enSpecs = this.findProductSpecs(productId, categoryType, subCategoryName, englishData);
      const arSpecs = this.findProductSpecs(productId, categoryType, subCategoryName, arabicData);

      const specs = enSpecs?.specificationsTable || arSpecs?.specificationsTable || {};

      // Create product slug
      const productSlug = SmartSlugGenerator.generateUniqueSlug(productData.productName || productId, 'product');

      // Create Product
      const product = await prisma.product.create({
        data: {
          productId: productData.productId,
          subCategoryId,
          slug: productSlug,
          price: productData.price || 0,
          inventory: productData.inventory || 0,
          images: productData.productImages || [],

          // Specifications
          voltage: DataProcessor.extractSpecValue(specs.voltage),
          maxWattage: typeof specs.maximum_wattage === 'number' ? specs.maximum_wattage : null,
          brandOfLed: DataProcessor.extractSpecValue(specs.brand_of_led),
          luminousFlux: DataProcessor.extractSpecValue(specs.luminous_flux),
          mainMaterial: DataProcessor.extractSpecValue(specs.main_material),
          cri: DataProcessor.extractSpecValue(specs.cri),
          beamAngle: typeof specs.beam_angle === 'number' ? specs.beam_angle : null,
          productDimensions: DataProcessor.extractSpecValue(specs.product_dimensions),
          holeSize: DataProcessor.extractSpecValue(specs.hole_size),
          powerFactor: DataProcessor.extractSpecValue(specs.power_factor),
          colorTemperatures: DataProcessor.mapColorTemperature(specs.color_Temperature),
          ipRating: DataProcessor.mapIPRating(specs.IP),
          maxIpRating: DataProcessor.mapMaxIPRating(specs.maxIP),
          lifeTime: specs.life_time || null,
          availableColors: specs.surface_color || [],

          isActive: true,
          isFeatured: false,
          order: 0,
        },
      });

      Logger.incrementMetric('products');

      // Create Product Translations
      for (const locale of ['en', 'ar'] as SupportedLanguage[]) {
        const translatedName = locale === 'en'
          ? (enSpecs?.productName || productData.productName)
          : (arSpecs?.productName || productData.productName);

        await prisma.productTranslation.create({
          data: {
            productId: product.id,
            locale,
            name: translatedName || productId,
            description: `${translatedName} - Professional lighting solution`,
          },
        });

        Logger.incrementMetric('translations');
      }

      console.log(`    ✅ Product: ${productId}`);

    } catch (error) {
      Logger.error(`Failed to process product: ${productId}`, error);
    }
  }

  private static findProductSpecs(
    productId: string,
    categoryType: string,
    subCategoryName: string,
    translationData: any
  ): any {
    const subCategoryProducts = translationData?.categories?.[categoryType]?.[subCategoryName];
    if (!subCategoryProducts) return null;

    const groups = Array.isArray(subCategoryProducts)
      ? subCategoryProducts
      : [subCategoryProducts];

    for (const group of groups) {
      if (!group) continue;

      if (Array.isArray(group)) {
        for (const item of group) {
          if (item && typeof item === 'object' && item[productId]) {
            return item[productId];
          }
        }
      } else if (typeof group === 'object' && group[productId]) {
        return group[productId];
      }
    }

    return null;
  }
}

// ==================== MAIN EXECUTION ====================

async function main() {
  const startTime = Date.now();

  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Using: ${isAccelerate && isUsingDirectConnection ? 'DIRECT_URL (Neon direct)' : isAccelerate ? 'DATABASE_URL (Prisma Accelerate)' : 'DATABASE_URL (Direct)'}`);
    await prisma.$connect();
    Logger.success('Database connected');

    await SeedEngine.seedDatabase();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️ Total time: ${duration}s`);

  } catch (error) {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Error handlers
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Execute
main();