# Database Package

هذا الحزمة تحتوي على إعدادات Prisma مع Neon و Prisma Accelerate.

## الإعدادات المطلوبة في ملف `.env`

### عند استخدام Prisma Accelerate (الموصى به):

```env
# رابط Prisma Accelerate للاستخدام العادي
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/...

# رابط Neon المباشر للـ migrations والـ schema push
DIRECT_URL=postgresql://neondb_owner:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### عند استخدام Neon مباشر (بدون Accelerate):

```env
# رابط Neon المباشر
DATABASE_URL=postgresql://neondb_owner:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# نفس الرابط (أو يمكن استخدام نفس DATABASE_URL)
DIRECT_URL=postgresql://neondb_owner:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

## الملفات المهمة

- `prisma/schema.prisma`: يحتوي على schema قاعدة البيانات
- `client.ts`: يحتوي على إعداد PrismaClient مع دعم Accelerate و Neon
- `prisma.config.ts`: يستخدم DIRECT_URL للـ migrations

## الأوامر المتاحة

```bash
# توليد Prisma Client
pnpm db:generate

# رفع schema إلى قاعدة البيانات
pnpm db:push

# إنشاء migration جديد
pnpm db:migrate

# فتح Prisma Studio
pnpm db:studio
```

## ملاحظات

- عند استخدام Prisma Accelerate، لا نحتاج إلى `PrismaNeon` adapter
- عند استخدام Neon مباشر، نحتاج إلى `PrismaNeon` adapter
- الكود في `client.ts` يكتشف تلقائياً نوع الاتصال بناءً على `DATABASE_URL`
