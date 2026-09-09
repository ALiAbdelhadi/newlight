import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["test/**/*.test.ts"],
        fileParallelism: true,
        sequence: { concurrent: false },
        hookTimeout: 120_000,
        testTimeout: 60_000,
    },
})
