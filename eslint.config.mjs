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
    files: ["apps/api/src/modules/carts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/catalog/application/**",
            "**/catalog/infrastructure/**",
            "**/catalog/presentation/**",
            "**/inventory/application/**",
            "**/inventory/infrastructure/**",
            "**/inventory/presentation/**",
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/modules/inventory/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/carts/application/**",
            "**/carts/infrastructure/**",
            "**/carts/presentation/**",
            "**/catalog/application/**",
            "**/catalog/infrastructure/**",
            "**/catalog/presentation/**",
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/modules/orders/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/carts/application/**",
            "**/carts/infrastructure/**",
            "**/carts/presentation/**",
            "**/inventory/application/**",
            "**/inventory/infrastructure/**",
            "**/inventory/presentation/**",
            "**/catalog/application/**",
            "**/catalog/infrastructure/**",
            "**/catalog/presentation/**",
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/modules/payments/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/orders/application/**",
            "**/orders/infrastructure/**",
            "**/orders/presentation/**",
            "**/inventory/application/**",
            "**/inventory/infrastructure/**",
            "**/inventory/presentation/**",
            "**/carts/application/**",
            "**/carts/infrastructure/**",
            "**/carts/presentation/**",
          ],
        },
      ],
    },
  },
  {
    files: [
      "apps/api/src/modules/{catalog,identity,carts,inventory,orders}/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/payments/application/**",
            "**/payments/infrastructure/**",
            "**/payments/presentation/**",
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
