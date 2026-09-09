import { AuthCentered } from "@/components/auth/auth-split"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function ForgotPasswordPage() {
    return (
        <AuthCentered>
            <ForgotPasswordForm />
        </AuthCentered>
    )
}
