import { describe, expect, it } from "vitest";
import { env, getEnv } from "../../../src/shared/lib/env";

describe("env", () => {
  it("resuelve migrarGuiaUrl a partir de diagnosticoUrl si no está definida explícitamente", () => {
    const config = getEnv();
    expect(config.diagnosticoUrl).toBeDefined();
    if (config.diagnosticoUrl) {
      expect(config.migrarGuiaUrl).toBe(
        config.diagnosticoUrl.replace(/\/diagnostico\/?$/, "/guia"),
      );
    }
  });

  it("cuenta con subscription de Pub/Sub por defecto", () => {
    expect(env.pubsubSubscription).toContain("subscriptions/");
  });
});
