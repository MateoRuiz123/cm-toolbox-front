import { describe, expect, it, vi } from "vitest";
import type Keycloak from "keycloak-js";
import { ensureKeycloakInit } from "./keycloak-init";

describe("ensureKeycloakInit", () => {
  it("retorna autenticado inmediatamente si keycloak ya fue inicializado", async () => {
    const keycloak = {
      didInitialize: true,
      authenticated: true,
      init: vi.fn(),
    } as unknown as Keycloak;

    const resultado = await ensureKeycloakInit(keycloak);
    expect(resultado).toEqual({ autenticado: true, error: null });
    expect(keycloak.init).not.toHaveBeenCalled();
  });

  it("retorna no autenticado si keycloak ya fue inicializado sin sesión", async () => {
    const keycloak = {
      didInitialize: true,
      authenticated: false,
      init: vi.fn(),
    } as unknown as Keycloak;

    const resultado = await ensureKeycloakInit(keycloak);
    expect(resultado).toEqual({ autenticado: false, error: null });
    expect(keycloak.init).not.toHaveBeenCalled();
  });

  it("inicializa sin iframe de cookies de terceros", async () => {
    const initMock = vi.fn().mockResolvedValue(true);
    const keycloak = {
      didInitialize: false,
      init: initMock,
    } as unknown as Keycloak;

    await ensureKeycloakInit(keycloak);

    const opciones = initMock.mock.calls[0][0];
    expect(opciones.checkLoginIframe).toBe(false);
    expect(opciones.silentCheckSsoRedirectUri).toBeUndefined();
    expect(opciones.onLoad).toBeUndefined();
  });

  it("es idempotente y reutiliza la misma promesa cuando hay llamadas concurrentes", async () => {
    let resolveInit: (val: boolean) => void = () => {};
    const initMock = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveInit = resolve;
        }),
    );

    const keycloak = {
      didInitialize: false,
      init: initMock,
    } as unknown as Keycloak;

    const promise1 = ensureKeycloakInit(keycloak);
    const promise2 = ensureKeycloakInit(keycloak);

    resolveInit(true);

    const [res1, res2] = await Promise.all([promise1, promise2]);
    expect(res1.autenticado).toBe(true);
    expect(res2.autenticado).toBe(true);
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it("espera a la promesa en curso aunque didInitialize sea true de forma sincrona", async () => {
    let resolveInit: (val: boolean) => void = () => {};
    const keycloak = {
      didInitialize: false,
      authenticated: false,
      init: vi.fn().mockImplementation(() => {
        keycloak.didInitialize = true;
        return new Promise<boolean>((resolve) => {
          resolveInit = (val) => {
            keycloak.authenticated = val;
            resolve(val);
          };
        });
      }),
    } as unknown as Keycloak;

    const promise1 = ensureKeycloakInit(keycloak);
    expect(keycloak.didInitialize).toBe(true);
    expect(keycloak.authenticated).toBe(false);

    // En StrictMode de React se dispara una segunda llamada concurrente
    const promise2 = ensureKeycloakInit(keycloak);

    resolveInit(true);

    const [res1, res2] = await Promise.all([promise1, promise2]);
    expect(res1.autenticado).toBe(true);
    expect(res2.autenticado).toBe(true);
  });

  it("describe el error cuando keycloak.init falla", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const keycloak = {
      didInitialize: false,
      init: vi.fn().mockRejectedValue(new Error("Failed to fetch")),
    } as unknown as Keycloak;

    const resultado = await ensureKeycloakInit(keycloak);

    expect(resultado.autenticado).toBe(false);
    expect(resultado.error?.codigo).toBe("red_o_cors");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
