/// <reference types="vitest/config" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/** Solo lo lee el servidor de Vite. El bundle no referencia esta variable. */
const resolveDiagnosticoUpstream = (env: Record<string, string>): string => {
  const explicit = (
    env.DIAGNOSTICO_API_UPSTREAM ||
    process.env.DIAGNOSTICO_API_UPSTREAM ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;

  const legacy = (env.VITE_DIAGNOSTICO_URL ?? "").trim();
  const stripped = legacy.replace(/\/migracion\/diagnostico\/?$/, "");
  if (/^https?:\/\//.test(stripped) && stripped !== legacy) return stripped;

  return "http://localhost:8080";
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT || process.env.PORT) || 3000;
  const logsApiUpstream =
    env.LOGS_API_UPSTREAM || process.env.LOGS_API_UPSTREAM || "http://localhost:8081";
  const accessApiUpstream =
    env.ACCESS_API_UPSTREAM || process.env.ACCESS_API_UPSTREAM || "http://localhost:8083";
  const diagnosticoUpstream = resolveDiagnosticoUpstream(env);
  const proxy = {
    "/migracion": {
      target: diagnosticoUpstream,
      changeOrigin: true,
      timeout: 120_000,
      proxyTimeout: 120_000,
    },
    "/logs-api": {
      target: logsApiUpstream,
      changeOrigin: true,
      ws: true,
      rewrite: (requestPath: string) => requestPath.replace(/^\/logs-api/, ""),
    },
    "/access-api": {
      target: accessApiUpstream,
      changeOrigin: true,
      rewrite: (requestPath: string) => requestPath.replace(/^\/access-api/, ""),
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    server: { port, proxy },
    preview: { port, proxy },
    test: {
      include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
      exclude: ["**/node_modules/**", "**/dist/**", "utils/**"],
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
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
