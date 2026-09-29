import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: { process: "readonly" } },
  },
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "packages/api-contracts/src/generated.ts",
    ],
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["@goodform/api", "@goodform/api/*", "drizzle-orm", "pg"] },
      ],
    },
  },
  {
    files: [
      "apps/api/src/modules/{catalog,carts,inventory,orders,payments}/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/identity/application/**",
            "**/identity/presentation/**",
            "**/identity/infrastructure/**",
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/modules/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@nestjs/*", "drizzle-orm", "pg", "**/infrastructure/**"],
        },
      ],
    },
  },
);
