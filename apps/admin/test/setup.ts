import { vi } from "vitest"

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
    auth: {
        $context: Promise.resolve({
            password: { hash: async (value: string) => `hashed:${value}` },
        }),
    },
}))

vi.mock("@/lib/revalidate", () => ({
    revalidateStorefront: vi.fn(async () => ({ ok: true })),
}))
