import { afterEach, describe, expect, it, vi } from "vitest";
import { env, getEnv } from "../../../src/shared/lib/env";

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa rutas same-origin aunque el entorno traiga el host del API", () => {
    vi.stubEnv(
      "VITE_DIAGNOSTICO_URL",
      "https://api.example/cm-api-internos/migracion/diagnostico",
    );
    vi.stubEnv("VITE_MIGRAR_GUIA_URL", "https://api.example/migracion/guia");

    const config = getEnv();
    expect(config.diagnosticoUrl).toBe("/migracion/diagnostico");
    expect(config.migrarGuiaUrl).toBe("/migracion/guia");
  });

  it("cuenta con subscription de Pub/Sub por defecto", () => {
    expect(env.pubsubSubscription).toContain("subscriptions/");
  });
});
