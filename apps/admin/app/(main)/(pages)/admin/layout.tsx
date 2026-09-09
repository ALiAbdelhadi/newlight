import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardStats } from "@/app/action/dashboard-actions";
import { getCurrentUserInfo } from "@/app/action/user-actions";
import { currentAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/shell/admin-shell";

interface AdminLayoutProps {
    children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
    const admin = await currentAdmin()
    if (!admin) redirect("/unauthorized")

    const [stats, userInfo] = await Promise.all([getDashboardStats(), getCurrentUserInfo()])

    return (
        <AdminShell
            stats={stats}
            user={userInfo ? { name: userInfo.name, email: userInfo.email } : null}
        >
            {children}
        </AdminShell>
    )
}
