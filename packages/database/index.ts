import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import dotenv from 'dotenv'

dotenv.config()
const connectionString = process.env.DATABASE_URL

const adapter = new PrismaNeon({ connectionString })

  declare global {
    var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter })


if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export * from "@prisma/client";