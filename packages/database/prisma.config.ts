import { defineConfig } from "prisma/config"

import { loadEnv } from "./scripts/env.mjs"

loadEnv()

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: process.env.PRISMA_DATASOURCE_URL ?? process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
        shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
    },
})
