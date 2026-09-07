import { redirect } from "next/navigation"
import { currentAdmin } from "@/lib/auth"

/**
 * The admin root. `currentAdmin()` returns null for both "not signed in" and "signed in but
 * not an admin", which is why this page can tell the two apart by asking once: the proxy
 * already redirected anyone without a session cookie, so reaching here signed-out means the
 * cookie was stale, and reaching here as a CUSTOMER means the account exists but lacks the
 * role.
 *
 * It used to render a second sign-in — a "role" and a shared "admin password" checked against
 * ADMIN_NAME / ADMIN_PASSWORD by `/api/verify-admin`. That gate was deleted rather than
 * fixed, on three counts:
 *
 *   It PROTECTED NOTHING. Success did `router.push("/admin/dashboard")` on the client, and
 *   anyone already signed in could type that URL instead. Every real page is guarded by
 *   `requireCurrentAdmin()`, which reads the role from the database.
 *
 *   It was a SHARED SECRET compared with `===` against a plaintext environment variable —
 *   one password for every administrator, no rotation, no record of who used it, and a
 *   distinct 401 that made the endpoint an oracle for guessing it.
 *
 *   It was DEAD. Neither variable is set in any .env file, so the endpoint answered 500 and
 *   the root page could not be passed by anybody, correct password or not.
 *
 * Same reasoning as §12: a privilege check with no privilege behind it is removed, not
 * guarded.
 */
const AdminPage = async () => {
    const admin = await currentAdmin()
    if (!admin) redirect("/sign-in")
    redirect("/admin/dashboard")
}

export default AdminPage
