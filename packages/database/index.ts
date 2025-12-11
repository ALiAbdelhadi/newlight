import { PrismaClient } from './prisma/client'

declare global {
  // لمنع إنشاء أكثر من اتصال في التطوير
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export * from './prisma/client'