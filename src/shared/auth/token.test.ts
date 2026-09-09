import { describe, expect, it } from "vitest";
import {
  guardarSesionTokens,
  guardarToken,
  limpiarToken,
  obtenerSesionTokens,
  obtenerToken,
} from "./token";
import { safeStorage } from "../lib/safe-storage";

describe("token auth storage", () => {
  it("guarda, obtiene y limpia el token corporativo correctamente", () => {
    limpiarToken();
    expect(obtenerToken()).toBeNull();

    guardarToken("jwt.dummy.token");
    expect(obtenerToken()).toBe("jwt.dummy.token");
    expect(safeStorage.getItem("token_sigoo")).toBe("jwt.dummy.token");

    limpiarToken();
    expect(obtenerToken()).toBeNull();
    expect(safeStorage.getItem("token_sigoo")).toBeNull();
  });

  it("no guarda tokens vacíos o nulos", () => {
    limpiarToken();
    guardarToken("");
    guardarToken(null);
    guardarToken(undefined);
    expect(obtenerToken()).toBeNull();
  });

  it("reanuda la sesión de la pestaña solo con token y refreshToken válidos", () => {
    limpiarToken();
    expect(obtenerSesionTokens()).toBeNull();

    guardarSesionTokens({
      token: "access",
      refreshToken: "refresh",
      idToken: "id",
    });
    expect(obtenerSesionTokens()).toEqual({
      token: "access",
      refreshToken: "refresh",
      idToken: "id",
    });

    limpiarToken();
    expect(obtenerSesionTokens()).toBeNull();

    guardarSesionTokens({ token: "access" });
    expect(obtenerSesionTokens()).toBeNull();
  });
});
