/**
 * Create the first administrator — BUILD §7.
 *
 *   pnpm --filter @repo/database seed:super-admin -- --email you@example.com --name "Your Name"
 *
 * The admin app has no sign-up route and its auth instance sets `disableSignUp`, so there is
 * deliberately no in-app way to make an administrator. That leaves exactly one bootstrap
 * problem — the first one — and this is it. Every administrator after that is created by an
 * existing SUPER_ADMIN through the panel.
 *
 * The password is GENERATED and printed, never taken as an argument: a password passed on the
 * command line lands in shell history and in the process list, where it outlives the session
 * that created it. Change it after the first sign-in.
 *
 * Hashing goes through Better Auth's own context so the stored hash is whatever Better Auth
 * expects to verify. Reimplementing scrypt here would work until it silently did not.
 */
import { randomBytes } from "node:crypto"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function arg(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? undefined : process.argv[index + 1]
}

/** Not a memorable password; it is meant to be pasted once and replaced. */
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
        // Promoting is safe and idempotent; overwriting a password is not something a seed
        // script should do silently.
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
