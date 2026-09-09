import { redirect } from "next/navigation"
import { currentAdmin } from "@/lib/auth"

const AdminPage = async () => {
    const admin = await currentAdmin()
    if (!admin) redirect("/sign-in")
    redirect("/admin/dashboard")
}

export default AdminPage
