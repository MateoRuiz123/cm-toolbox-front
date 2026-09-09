import type Keycloak from "keycloak-js";
import { describe, expect, it } from "vitest";
import { extraerIdentidadToken } from "./use-keycloak-auth";

describe("extraerIdentidadToken — autenticación directa Keycloak", () => {
  it("autentica directamente con el email del idToken", () => {
    const keycloak = {
      idTokenParsed: { email: "mrivera@coordinadora.com", terminal: 10 },
      token: "jwt-token-valido",
    } as unknown as Keycloak;

    const resultado = extraerIdentidadToken(keycloak);

    expect(resultado.estadoAuth).toBe("autenticado");
    expect(resultado.email).toBe("mrivera@coordinadora.com");
    expect(resultado.terminal).toBe(10);
  });

  it("permite autenticar si viene preferred_username en vez de email", () => {
    const keycloak = {
      idTokenParsed: { preferred_username: "mrivera", terminal: "42" },
      token: "jwt-token-valido",
    } as unknown as Keycloak;

    const resultado = extraerIdentidadToken(keycloak);

    expect(resultado.estadoAuth).toBe("autenticado");
    expect(resultado.email).toBe("mrivera");
    expect(resultado.terminal).toBe("42");
  });

  it("deja sin_acceso si el token no tiene identidad de usuario", () => {
    const keycloak = {
      idTokenParsed: { terminal: 10 },
      token: "jwt-token-valido",
    } as unknown as Keycloak;

    const resultado = extraerIdentidadToken(keycloak);

    expect(resultado.estadoAuth).toBe("sin_acceso");
    expect(resultado.email).toBe("");
  });

  it("funciona correctamente sin claim de terminal", () => {
    const keycloak = {
      idTokenParsed: { email: "mrivera@coordinadora.com" },
      token: "jwt-token-valido",
    } as unknown as Keycloak;

    const resultado = extraerIdentidadToken(keycloak);

    expect(resultado.estadoAuth).toBe("autenticado");
    expect(resultado.terminal).toBe("");
  });
});
