import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["test/**/*.test.ts"],
        // Each file gets its own disposable database, so files may run in parallel but the
        // cases inside one must not — they share a catalog and a ledger.
        fileParallelism: true,
        sequence: { concurrent: false },
        // Creating a database and replaying 14 migrations is a few seconds before a single
        // assertion runs.
        hookTimeout: 120_000,
        testTimeout: 60_000,
    },
})
