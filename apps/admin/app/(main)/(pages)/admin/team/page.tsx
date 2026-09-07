import { currentAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { AdminUserService } from "@/lib/services/admin-user-service"
import { TeamManager } from "./team-manager"

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
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Administrators" />
            <div className="mt-8">
                <Container>
                    <div className="flex flex-wrap gap-3 mb-6">
                        <Badge variant="outline">{admins.length} administrator{admins.length === 1 ? "" : "s"}</Badge>
                        <Badge variant="outline">{customers} customer{customers === 1 ? "" : "s"}</Badge>
                        <Badge variant={me.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                            you are {me.role}
                        </Badge>
                    </div>

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
                </Container>
            </div>
        </div>
    )
}
