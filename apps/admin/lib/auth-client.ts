"use client"

import { createAuthClient } from "better-auth/react"

// No baseURL on purpose: the browser must talk to the origin the page was served from. A fixed
// NEXT_PUBLIC_ADMIN_URL would send a sign-in on newlight-admin.vercel.app to admin.newlight-eg.com
// — a cross-origin request, and a dead one while that domain has no DNS.
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient
