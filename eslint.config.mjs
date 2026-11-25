import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Client Prisma gerado para o fallback SQLite de dev (npm run db:sqlite).
    "src/generated/**",
    "prisma/sqlite/**",
  ]),
  {
    // Testes de segurança rodam com `node --test` puro (CommonJS no harness).
    files: ["tests/**/*.cjs", "tests/**/*.mjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
