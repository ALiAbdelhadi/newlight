/**
 * Reset an administrator's password — the counterpart to seed-super-admin.ts.
 *
 *   pnpm --filter @repo/database admin:reset-password -- --email you@example.com
 *
 * The admin app has no password-reset route and no sign-up route, so a lost administrator
 * password has no in-app recovery path. This is that path, and it is deliberately the only one.
 *
 * Like the seed script, the password is GENERATED and printed rather than taken as an argument:
 * a password passed on the command line lands in shell history and in the process list, where it
 * outlives the session that created it. Hashing goes through Better Auth's own context so the
 * stored hash is whatever Better Auth expects to verify.
 *
 * Every existing session for the account is deleted in the same transaction as the new hash.
 * A password reset that leaves old sessions signed in has not actually locked anyone out.
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

    if (!email) {
        console.error("usage: reset-admin-password.ts --email <address>")
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
        // Customers sign in through the storefront and have their own recovery. This script
        // exists for the accounts that have none, and widening it would make it a back door.
        console.error(`[reset] ${email} has role ${user.role}; this script only resets administrators.`)
        process.exit(1)
    }

    const auth = betterAuth({
        database: prismaAdapter(prisma, { provider: "postgresql" }),
        secret: process.env.BETTER_AUTH_SECRET,
        emailAndPassword: { enabled: true },
    })

    const password = generatePassword()
    const hash = await auth.$context.then((context) => context.password.hash(password))

    const sessionsRevoked = await prisma.$transaction(async (tx) => {
        const account = await tx.account.findFirst({
            where: { userId: user.id, providerId: "credential" },
            select: { id: true },
        })

        if (account) {
            await tx.account.update({ where: { id: account.id }, data: { password: hash } })
        } else {
            // An administrator with no credential account cannot sign in at all — the seed script
            // creates one alongside the user, so its absence means something removed it. Restoring
            // it is the same operation as resetting the password.
            await tx.account.create({
                data: { userId: user.id, accountId: user.id, providerId: "credential", password: hash },
            })
        }

        const { count } = await tx.session.deleteMany({ where: { userId: user.id } })
        return count
    })

    console.log("")
    console.log(`[reset] password reset for ${user.role} ${email}`)
    console.log(`[reset] password: ${password}`)
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
