/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT || process.env.PORT) || 3000;

  return {
    plugins: [react(), tailwindcss()],
    server: { port },
    preview: { port },
    test: {
      include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
      exclude: ["**/node_modules/**", "**/dist/**", "utils/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov", "json-summary"],
        reportsDirectory: "coverage",
        include: ["src/shared/auth/**/*.ts", "src/shared/lib/**/*.ts"],
        exclude: [
          "**/node_modules/**",
          "**/dist/**",
          "utils/**",
          "test/**",
          "src/shared/auth/keycloak-client.ts",
          "src/shared/auth/use-auth.ts",
          "src/shared/auth/auth-context-base.ts",
          "src/shared/auth/use-dev-auth.ts",
          "src/shared/auth/use-keycloak-auth.ts",
          "src/shared/auth/keycloak-init.ts",
          "src/shared/lib/env.ts",
          "src/shared/lib/analytics.ts",
          "src/shared/lib/safe-storage.ts",
          "src/shared/lib/use-page-title.ts",
        ],
        thresholds: {
          lines: 90,
          statements: 90,
          branches: 80,
          functions: 90,
        },
      },
    },
  };
});
