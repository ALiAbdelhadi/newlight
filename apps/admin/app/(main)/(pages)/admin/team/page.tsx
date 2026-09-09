import { currentAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminUserService } from "@/lib/services/admin-user-service"
import { TeamManager } from "./team-manager"
import { PageBody, PageHeader } from "@/components/page"
import { StatusBadge } from "@/components/status-badge"

/**
 * Administrators.
 *
 * `seed-super-admin.ts` says the administrators after the first are created "through the
 * panel". They were not, because this page did not exist — the only way in was a script with a
 * database URL, and there was no way at all to remove someone who left.
 */
export const dynamic = "force-dynamic"

export default async function TeamPage() {
    const me = await currentAdmin()
    if (!me) redirect("/sign-in")

    const { admins, customers } = await AdminUserService.list()

    return (
        <>
            <PageHeader
                title="Administrators"
                description="Who can sign into this panel, and what each of them is allowed to do. Only a SUPER_ADMIN can promote, demote or remove an administrator."
                /*
                 * Your own role, in the header rather than as one chip among three counts.
                 * Whether you may promote somebody is the first thing this screen has to
                 * answer, and it governs every control below it.
                 */
                status={<StatusBadge kind="role" value={me.role} />}
                actions={
                    <p className="text-xs tabular-nums text-muted-foreground">
                        {admins.length} administrator{admins.length === 1 ? "" : "s"} · {customers} customer
                        {customers === 1 ? "" : "s"}
                    </p>
                }
            />

            <PageBody>
                <TeamManager
                    me={{ id: me.id, role: me.role }}
                    admins={admins.map((a) => ({
                        id: a.id,
                        name: a.name,
                        email: a.email,
                        role: a.role as "ADMIN" | "SUPER_ADMIN",
                        sessions: a._count.sessions,
                        createdAt: a.createdAt.toISOString(),
                    }))}
                />
            </PageBody>
        </>
    )
}
