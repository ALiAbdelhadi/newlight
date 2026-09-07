import { vi } from "vitest"

/**
 * The admin services all begin with `requireCurrentAdmin()`, which reads Next's `headers()`
 * and builds a Better Auth instance — neither of which exists outside a request.
 *
 * Mocking the SEAM is the point of there being one: every service goes through exactly this
 * function, so one mock covers the app. What the tests then exercise is the business logic
 * behind the guard, and the guard itself is tested in apps/www/test/auth.test.ts against a
 * real database.
 */
vi.mock("@/lib/auth", () => ({
    requireCurrentAdmin: vi.fn(async () => ({
        id: "test-admin",
        email: "admin@newlight.invalid",
        name: "Test Admin",
        role: "SUPER_ADMIN" as const,
        image: null,
    })),
    currentAdmin: vi.fn(async () => ({
        id: "test-admin",
        email: "admin@newlight.invalid",
        name: "Test Admin",
        role: "SUPER_ADMIN" as const,
        image: null,
    })),
    currentAdminId: vi.fn(async () => "test-admin"),
    requireCurrentSuperAdmin: vi.fn(async () => ({
        id: "test-admin",
        email: "admin@newlight.invalid",
        name: "Test Admin",
        role: "SUPER_ADMIN" as const,
        image: null,
    })),
    // `AdminUserService.create` hashes through Better Auth's own context so the stored hash is
    // one Better Auth can verify. In a test there is no instance, and what matters is that a
    // hash is stored and is not the password — so this stands in for it and says so.
    auth: {
        $context: Promise.resolve({
            password: { hash: async (value: string) => `hashed:${value}` },
        }),
    },
}))

// The storefront is a separate deployment; there is nothing to revalidate in a test run.
vi.mock("@/lib/revalidate", () => ({
    revalidateStorefront: vi.fn(async () => ({ ok: true })),
}))
