import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AccessApiError,
  buildAccessHeaders,
  fetchMyAccess,
  getDevImpersonatedEmail,
  setDevImpersonatedEmail,
} from "../../../src/shared/auth/access-api";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";
import { guardarToken, limpiarToken } from "../../../src/shared/auth/token";

describe("access-api y access-types", () => {
  afterEach(() => {
    limpiarToken();
    setDevImpersonatedEmail(null);
    vi.restoreAllMocks();
  });

  it("construye el perfil fallback con rol admin y catálogo por defecto", () => {
    const profile = buildFallbackAccessProfile("test@coordinadora.com");
    expect(profile.email).toBe("test@coordinadora.com");
    expect(profile.roleId).toBe("admin");
    expect(profile.isSuperAdmin).toBe(true);
    expect(profile.apps.length).toBeGreaterThanOrEqual(3);
  });

  it("gestiona el correo simulado de desarrollo y construye headers con Bearer y x-dev-user-email", () => {
    expect(getDevImpersonatedEmail()).toBeNull();

    guardarToken("jwt-test-123");
    setDevImpersonatedEmail("  SubAdmin.Local@coordinadora.com  ");
    expect(getDevImpersonatedEmail()).toBe("subadmin.local@coordinadora.com");

    const headers = buildAccessHeaders(true);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer jwt-test-123");
    expect(headers["x-dev-user-email"]).toBe("subadmin.local@coordinadora.com");

    setDevImpersonatedEmail("");
    expect(getDevImpersonatedEmail()).toBeNull();
  });

  it("fetchMyAccess devuelve el perfil efectivo en 200 OK", async () => {
    const sample = buildFallbackAccessProfile("operador@coordinadora.com");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: sample }),
    } as Response);

    const res = await fetchMyAccess();
    expect(res.email).toBe("operador@coordinadora.com");
  });

  it("fetchMyAccess lanza AccessApiError con code y message del backend cuando falla", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        code: "USER_BLOCKED",
        message: "Cuenta bloqueada por administración.",
      }),
    } as Response);

    await expect(fetchMyAccess()).rejects.toMatchObject({
      name: "AccessApiError",
      status: 403,
      code: "USER_BLOCKED",
      message: "Cuenta bloqueada por administración.",
    });
  });

  it("fetchMyAccess lanza INVALID_PAYLOAD si la respuesta 200 no contiene data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await expect(fetchMyAccess()).rejects.toBeInstanceOf(AccessApiError);
  });
});
