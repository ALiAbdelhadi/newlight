"use client"

import { SignInForm } from "@/components/auth/sign-in-form"

/**
 * Kept as a named wrapper so the existing route keeps its import. The Clerk `<SignIn />` it
 * used to wrap carried ~90 lines of `appearance` overrides; those values are now Tailwind
 * classes in components/auth/auth-form.tsx, which is where a design change belongs.
 */
export function ThemedSignIn() {
    return <SignInForm />
}
