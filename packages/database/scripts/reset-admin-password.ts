import { randomBytes } from "node:crypto"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { createPrismaClient } from "../prisma-client"

const prisma = createPrismaClient()

function arg(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? undefined : process.argv[index + 1]
}

function generatePassword(): string {
    return randomBytes(18).toString("base64url")
}

// Better Auth in apps/admin enforces minPasswordLength: 12; a shorter one would be stored
// here and then refused at sign-in.
function chosenPassword(): string {
    const supplied = arg("password")
    if (supplied === undefined) return generatePassword()
    if (supplied.length < 12) {
        console.error("[password] --password must be at least 12 characters.")
        process.exit(2)
    }
    return supplied
}

async function main() {
    const email = arg("email")

    if (!email) {
        console.error("usage: reset-admin-password.ts --email <address> [--password <12+ chars>]")
        process.exit(2)
    }
    if (!process.env.BETTER_AUTH_SECRET) {
        console.error("[reset] BETTER_AUTH_SECRET is not set; the account would get a hash nothing can verify.")
        process.exit(2)
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
    })
    if (!user) {
        console.error(`[reset] no user with email ${email}.`)
        process.exit(1)
    }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
        console.error(`[reset] ${email} has role ${user.role}; this script only resets administrators.`)
        process.exit(1)
    }

    const auth = betterAuth({
        database: prismaAdapter(prisma, { provider: "postgresql" }),
        secret: process.env.BETTER_AUTH_SECRET,
        emailAndPassword: { enabled: true },
    })

    const password = chosenPassword()
    const hash = await auth.$context.then((context) => context.password.hash(password))

    const sessionsRevoked = await prisma.$transaction(async (tx) => {
        const account = await tx.account.findFirst({
            where: { userId: user.id, providerId: "credential" },
            select: { id: true },
        })

        if (account) {
            await tx.account.update({ where: { id: account.id }, data: { password: hash } })
        } else {
            await tx.account.create({
                data: { userId: user.id, accountId: user.id, providerId: "credential", password: hash },
            })
        }

        const { count } = await tx.session.deleteMany({ where: { userId: user.id } })
        return count
    })

    console.log("")
    console.log(`[reset] password reset for ${user.role} ${email}`)
    console.log(arg("password") === undefined ? `[reset] password: ${password}` : "[reset] password: the one you supplied")
    console.log(`[reset] ${sessionsRevoked} existing session(s) revoked; sign in again.`)
    console.log("[reset] This is printed once and is not stored anywhere else. Change it after signing in.")
    console.log("")
}

main()
    .catch((error) => {
        console.error(`[reset] ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
