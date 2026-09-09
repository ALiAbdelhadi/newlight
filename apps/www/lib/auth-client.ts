"use client"

import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"

// No baseURL on purpose: the browser talks to the origin the page was served from, so preview
// deployments and the *.vercel.app alias work without a per-deployment variable.
export const authClient = createAuthClient({
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
