import { ResetPasswordForm } from "@/components/auth/reset-password-form"

/**
 * The page a reset email links to. The token arrives as a query parameter, so this is a
 * server component that reads it once and hands it to the form — a client component reading
 * `window.location` would flash an empty form first.
 */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams
    return (
        <div className="mx-auto w-full max-w-md px-4 py-16">
            <ResetPasswordForm token={token ?? null} />
        </div>
    )
}
