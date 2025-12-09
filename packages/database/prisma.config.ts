import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

/**
 * ملف إعداد Prisma للـ migrations والـ schema push
 * يستخدم DIRECT_URL للاتصال المباشر بقاعدة البيانات
 * 
 * ملاحظة: DIRECT_URL يجب أن يكون رابط Neon المباشر (postgresql://...)
 * وليس رابط Prisma Accelerate (prisma+postgres://...)
 */
export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: env('DIRECT_URL'),
    },
})