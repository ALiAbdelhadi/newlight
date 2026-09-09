import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams
    return (
        <div className="mx-auto w-full max-w-md px-4 py-16">
            <ResetPasswordForm token={token ?? null} />
        </div>
    )
}
