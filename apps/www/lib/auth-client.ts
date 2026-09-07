"use client"

import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"

/**
 * The client half of the seam. Components import `signIn` / `signOut` / `useSession` from
 * here, never from `better-auth/react` directly — same rule as the server side, same reason.
 *
 * The extra user fields are declared inline rather than inferred from `typeof auth`, which is
 * the documented shortcut: importing the server instance's type into a "use client" module
 * drags the server config — and its `requiredEnv` calls — toward the browser bundle. The
 * price is that this list and lib/auth.ts's `additionalFields` must agree; they are both
 * short, and both in this directory.
 */
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        inferAdditionalFields({
            user: {
                // input: false mirrors the server. Without it the inferred sign-up payload
                // demands a `role`, which is exactly the field a sign-up request must not be
                // able to set.
                role: { type: "string", required: false, input: false },
                phoneNumber: { type: "string", required: false },
                preferredLanguage: { type: "string", required: false },
                preferredCurrency: { type: "string", required: false, input: false },
            },
        }),
    ],
})

export const { signIn, signUp, signOut, useSession, resetPassword } = authClient

/** Better Auth exposes the request-a-reset call on the client object rather than as a named
 *  export, so it is re-exported here to keep every call site importing from one place. */
export const requestPasswordReset = authClient.requestPasswordReset
