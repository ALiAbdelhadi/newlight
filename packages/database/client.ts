import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from './prisma/client/client'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

// إذا كان DATABASE_URL يبدأ بـ "prisma+" فهو Prisma Accelerate ولا نحتاج adapter
// إذا كان postgresql:// فهو Neon مباشر ونحتاج adapter
const isAccelerate = connectionString.startsWith('prisma+')

let prisma: PrismaClient

if (isAccelerate) {
  // استخدام Prisma Accelerate - لا نحتاج adapter
  prisma = new PrismaClient()
} else {
  // استخدام Neon مباشر - نحتاج adapter
  const adapter = new PrismaNeon({ connectionString })
  prisma = new PrismaClient({ adapter })
}

export { prisma }