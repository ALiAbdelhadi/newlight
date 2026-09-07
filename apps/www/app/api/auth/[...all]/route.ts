import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth"

/**
 * Better Auth's own endpoints. Deliberately OUTSIDE app/[locale] — an auth callback URL that
 * carries a locale segment is one a verification email can get wrong, and the API returns
 * JSON, which has no language.
 */
export const { GET, POST } = toNextJsHandler(auth)
