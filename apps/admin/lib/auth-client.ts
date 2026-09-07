"use client"

import { createAuthClient } from "better-auth/react"

/** The client half of the admin seam. No `signUp`: the admin app has no registration path. */
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_ADMIN_URL,
})

export const { signIn, signOut, useSession } = authClient
