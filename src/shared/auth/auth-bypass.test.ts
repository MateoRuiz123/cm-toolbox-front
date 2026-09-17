import { describe, expect, it } from "vitest";
import { esAuthBypassActivo } from "./auth-bypass";

describe("esAuthBypassActivo", () => {
  it("activa el bypass en DEV sin forzar Keycloak", () => {
    expect(esAuthBypassActivo({ DEV: true })).toBe(true);
  });

  it("desactiva el bypass en DEV si VITE_AUTH_FORCE_KEYCLOAK es true", () => {
    expect(
      esAuthBypassActivo({ DEV: true, VITE_AUTH_FORCE_KEYCLOAK: "true" }),
    ).toBe(false);
  });

  it("nunca activa el bypass fuera de DEV", () => {
    expect(esAuthBypassActivo({ DEV: false })).toBe(false);
    expect(
      esAuthBypassActivo({ DEV: false, VITE_AUTH_FORCE_KEYCLOAK: "true" }),
    ).toBe(false);
  });
});
