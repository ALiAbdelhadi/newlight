import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardStats } from "@/app/action/dashboard-actions";
import { getCurrentUserInfo } from "@/app/action/user-actions";
import { currentAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/shell/admin-shell";

/**
 * A layout receives `children` and route params — never a `stats` prop. Declaring one made the
 * component fail Next's own LayoutProps constraint, which is exactly the class of error
 * `ignoreBuildErrors: true` was hiding before P0 turned it off.
 */
interface AdminLayoutProps {
    children: ReactNode
}

/**
 * Deliberately NOT wrapped in Suspense.
 *
 * The first version put the shell behind a Suspense boundary whose fallback also rendered
 * `children`, so `children` appeared in both the fallback tree and the resolved tree. The
 * page mounted twice: `/admin/products` reported 100 rows for a 50-row page and ran its
 * database query twice on every load. A fallback that contains the same children it is
 * falling back for is not a fallback, it is a second copy.
 *
 * Awaiting is the right shape here anyway. `getDashboardStats` is wrapped in
 * `unstable_cache`, so it is a cache read on all but the first request, and the navigation
 * cannot render meaningfully without the counters it puts in the sidebar.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
    /*
     * The role check, once, at the top of the subtree (§21).
     *
     * The proxy only checks that a session cookie EXISTS, and every page's own
     * `requireCurrentAdmin()` THROWS — so a signed-in customer who typed an /admin URL landed
     * in the error boundary reading "This screen failed to load", which is both wrong and
     * unhelpful: nothing failed, they are simply not allowed in. The pages keep their guards
     * (defence in depth, and server actions are not covered by a layout); this one exists to
     * turn the refusal into the right screen instead of an error.
     */
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
