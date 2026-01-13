import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode, Suspense } from "react";

interface DashboardStats {
    orders: number
    shipping: number
    notifications: number
    reviews: number
    products: number
    customers: number
}

interface DashboardClientProps {
    stats: DashboardStats
    children: ReactNode,
}
function SidebarSkeleton() {
    return (
        <div className="fixed left-0 top-0 z-40 h-screen w-[280px] bg-background/95 backdrop-blur-md border-r border-border/30">
            <div className="p-6 border-b border-border/30">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            </div>
            <div className="p-4 space-y-2">
                {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}
export default function AdminLayout({ children }: DashboardClientProps) {
    return (
        <>
            <Suspense fallback={<SidebarSkeleton />}>
                <SidebarWrapper />
            </Suspense>
            <div>
                {children}
            </div>
        </>
    )
}