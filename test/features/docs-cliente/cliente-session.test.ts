import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/auth-bypass", () => ({
  esAuthBypassActivo: vi.fn(() => true),
}));

describe("cliente-session (bypass)", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loginCliente en bypass guarda token de humo", async () => {
    const { loginCliente, ensureClienteSession } =
      await import("../../../src/features/docs-cliente/auth/cliente-session");
    const { obtenerTokenCliente, limpiarTokenCliente } =
      await import("../../../src/features/docs-cliente/auth/cliente-token");

    expect(await ensureClienteSession()).toBe("anonymous");
    await loginCliente();
    expect(obtenerTokenCliente()).toBe("dev-cliente-token");
    expect(await ensureClienteSession()).toBe("authenticated");
    limpiarTokenCliente();
  });

  it("logoutCliente limpia token en bypass", async () => {
    const { loginCliente, logoutCliente } =
      await import("../../../src/features/docs-cliente/auth/cliente-session");
    const { obtenerTokenCliente } =
      await import("../../../src/features/docs-cliente/auth/cliente-token");

    await loginCliente();
    await logoutCliente();
    expect(obtenerTokenCliente()).toBeNull();
  });
});
