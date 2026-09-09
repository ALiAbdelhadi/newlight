import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * Standalone, for the same reason as @repo/database's: the §0.2 gate has to be able to fail,
 * and no-explicit-any is an error here with no exemptions.
 */
export default tseslint.config(
    { ignores: ["dist/**", "node_modules/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: { globals: { ...globals.node } },
        rules: { "@typescript-eslint/no-explicit-any": "error" },
    }
)
