"use server"

import { revalidatePath } from "next/cache"
import type { AdminRole } from "@repo/database"
import { AdminUserService, AdminUserError } from "@/lib/services/admin-user-service"
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth"
import type { ActionResult } from "@/app/action/catalog-actions"

function describe(error: unknown): string {
    if (error instanceof UnauthenticatedError) return "You are signed out. Sign in again."
    if (error instanceof ForbiddenError) return "Only a SUPER_ADMIN can manage administrators."
    if (error instanceof AdminUserError) return error.message
    console.error("[admin-user-action]", error)
    return error instanceof Error ? error.message : "Something went wrong."
}

export async function createAdmin(input: {
    email: string
    name: string
    role: AdminRole
}): Promise<ActionResult & { password?: string; email?: string }> {
    try {
        const result = await AdminUserService.create(input)
        revalidatePath("/admin/team")
        return { ok: true, message: "Administrator created.", password: result.password, email: result.email }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function setAdminRole(userId: string, role: AdminRole | "CUSTOMER"): Promise<ActionResult> {
    try {
        const { demoted } = await AdminUserService.setRole(userId, role)
        revalidatePath("/admin/team")
        return {
            ok: true,
            message: demoted ? "Changed, and every session signed out." : `Now ${role}.`,
        }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function revokeAdminSessions(userId: string): Promise<ActionResult> {
    try {
        const { count } = await AdminUserService.revokeSessions(userId)
        revalidatePath("/admin/team")
        return { ok: true, message: `Signed out of ${count} session(s).` }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}
