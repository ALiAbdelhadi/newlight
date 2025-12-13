import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Create intl middleware instance
const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware((auth, req) => {
  // Run intl after Clerk has done its checks
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // Pages except static files
    "/((?!_next|_vercel|.*\\..*).*)",
    // API routes
    "/(api|trpc)(.*)",
  ],
};