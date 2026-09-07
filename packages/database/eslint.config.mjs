import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Lint config for @repo/database.
 *
 * Standalone rather than extending @repo/eslint-config/base, which has no
 * consumers and is proposed for deletion in P1. (It used to load
 * eslint-plugin-only-warn, downgrading every error to a warning — that plugin has
 * since been removed from it.) The §0.2 gate has to be able to fail.
 */
export default tseslint.config(
    {
        ignores: ["prisma/client/**", "dist/**", "node_modules/**", "data/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
        },
    },
    {
        // CommonJS build shim run by `db:generate`, not application code.
        files: ["scripts/fix-prisma-imports.js"],
        languageOptions: { globals: globals.node, sourceType: "commonjs" },
        rules: { "@typescript-eslint/no-require-imports": "off" },
    },
    {
        // Node CLI entry points: process/console are legitimately global here.
        files: ["scripts/**/*.mjs"],
        languageOptions: { globals: globals.node, sourceType: "module" },
    }
);
