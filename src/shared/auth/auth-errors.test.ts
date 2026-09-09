import { describe, expect, it } from "vitest";
import { describirErrorAuth } from "./auth-errors";

describe("describirErrorAuth", () => {
  it("identifica el bloqueo de cookies de terceros del navegador", () => {
    const error = new Error(
      "Timeout when waiting for 3rd party check iframe message.",
    );

    const detalle = describirErrorAuth(error, "keycloak");

    expect(detalle.codigo).toBe("cookies_bloqueadas");
    expect(detalle.sugerencias.length).toBeGreaterThan(0);
    expect(detalle.detalleTecnico).toContain("3rd party check iframe");
  });

  it("identifica fallos de red o CORS", () => {
    const detalle = describirErrorAuth(
      new Error("Failed to fetch"),
      "permisos",
    );

    expect(detalle.codigo).toBe("red_o_cors");
    expect(detalle.titulo).toContain("permisos");
  });

  it("identifica configuración inválida del cliente de Keycloak", () => {
    const detalle = describirErrorAuth(
      { error: "invalid_client", error_description: "redirect_uri inválida" },
      "keycloak",
    );

    expect(detalle.codigo).toBe("configuracion");
  });

  it("usa un diagnóstico genérico cuando el error no es reconocible", () => {
    const detalle = describirErrorAuth(undefined, "keycloak");

    expect(detalle.codigo).toBe("desconocido");
    expect(detalle.detalleTecnico).toBe("Sin detalle técnico disponible");
  });
});
