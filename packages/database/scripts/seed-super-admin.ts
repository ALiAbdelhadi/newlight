import { randomBytes } from "node:crypto"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function arg(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? undefined : process.argv[index + 1]
}

function generatePassword(): string {
    return randomBytes(18).toString("base64url")
}

async function main() {
    const email = arg("email")
    const name = arg("name") ?? "Administrator"
    const role = (arg("role") ?? "SUPER_ADMIN") as "ADMIN" | "SUPER_ADMIN"

    if (!email) {
        console.error("usage: seed-super-admin.ts --email <address> [--name <name>] [--role ADMIN|SUPER_ADMIN]")
        process.exit(2)
    }
    if (!process.env.BETTER_AUTH_SECRET) {
        console.error("[seed] BETTER_AUTH_SECRET is not set; the account would be created with a hash nothing can verify.")
        process.exit(2)
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } })
    if (existing) {
        if (existing.role === role) {
            console.log(`[seed] ${email} already exists with role ${role}. Nothing to do.`)
            return
        }
        await prisma.user.update({ where: { id: existing.id }, data: { role } })
        console.log(`[seed] ${email} promoted from ${existing.role} to ${role}.`)
        return
    }

    const auth = betterAuth({
        database: prismaAdapter(prisma, { provider: "postgresql" }),
        secret: process.env.BETTER_AUTH_SECRET,
        emailAndPassword: { enabled: true },
    })

    const password = generatePassword()
    const hash = await auth.$context.then((context) => context.password.hash(password))

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: { email, name, role, emailVerified: true },
            select: { id: true },
        })
        await tx.account.create({
            data: { userId: user.id, accountId: user.id, providerId: "credential", password: hash },
        })
    })

    console.log("")
    console.log(`[seed] created ${role} ${email}`)
    console.log(`[seed] password: ${password}`)
    console.log("[seed] This is printed once and is not stored anywhere else. Change it after signing in.")
    console.log("")
}

main()
    .catch((error) => {
        console.error(`[seed] ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
