"use client"

import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        inferAdditionalFields({
            user: {
                role: { type: "string", required: false, input: false },
                phoneNumber: { type: "string", required: false },
                preferredLanguage: { type: "string", required: false },
                preferredCurrency: { type: "string", required: false, input: false },
            },
        }),
    ],
})

export const { signIn, signUp, signOut, useSession, resetPassword } = authClient

export const requestPasswordReset = authClient.requestPasswordReset
