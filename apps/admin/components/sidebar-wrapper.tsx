import { getDashboardStats } from "@/app/action/dashboard-actions"
import { Sidebar } from "./sidebar"
import { getCurrentUserInfo } from "@/app/action/user-actions"

interface SidebarWrapperProps {
    className?: string
}

export async function SidebarWrapper({ className }: SidebarWrapperProps) {

    const [stats, userInfo] = await Promise.all([
        getDashboardStats(),
        getCurrentUserInfo(),
    ])

    return <Sidebar className={className} stats={stats} userInfo={userInfo} />
}