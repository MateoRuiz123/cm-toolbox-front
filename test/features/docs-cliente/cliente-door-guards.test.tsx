import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BlockInternalOnClienteDoor,
  RedirectClienteAwayFromHub,
} from "../../../src/features/docs-cliente/auth/cliente-door-guards";
import * as clienteToken from "../../../src/features/docs-cliente/auth/cliente-token";
import * as authBypass from "../../../src/shared/auth/auth-bypass";
import * as internalToken from "../../../src/shared/auth/token";

describe("cliente door guards (CA-C04)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bloquea sesión interna en /cliente sin token cliente (sin bypass)", () => {
    vi.spyOn(authBypass, "esAuthBypassActivo").mockReturnValue(false);
    vi.spyOn(internalToken, "obtenerToken").mockReturnValue("jwt-interno");
    vi.spyOn(clienteToken, "obtenerTokenCliente").mockReturnValue(null);

    render(
      <MemoryRouter>
        <BlockInternalOnClienteDoor>
          <p>contenido cliente</p>
        </BlockInternalOnClienteDoor>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /acceso solo para clientes/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("contenido cliente")).not.toBeInTheDocument();
  });

  it("permite /cliente con sesión interna cuando el bypass local está activo", () => {
    vi.spyOn(authBypass, "esAuthBypassActivo").mockReturnValue(true);
    vi.spyOn(internalToken, "obtenerToken").mockReturnValue("jwt-interno");
    vi.spyOn(clienteToken, "obtenerTokenCliente").mockReturnValue(null);

    render(
      <MemoryRouter>
        <BlockInternalOnClienteDoor>
          <p>contenido cliente</p>
        </BlockInternalOnClienteDoor>
      </MemoryRouter>,
    );

    expect(screen.getByText("contenido cliente")).toBeInTheDocument();
  });

  it("permite /cliente cuando no hay token interno", () => {
    vi.spyOn(internalToken, "obtenerToken").mockReturnValue(null);
    vi.spyOn(clienteToken, "obtenerTokenCliente").mockReturnValue(null);

    render(
      <MemoryRouter>
        <BlockInternalOnClienteDoor>
          <p>contenido cliente</p>
        </BlockInternalOnClienteDoor>
      </MemoryRouter>,
    );

    expect(screen.getByText("contenido cliente")).toBeInTheDocument();
  });

  it("redirige token cliente fuera del hub a /cliente/docs", () => {
    vi.spyOn(clienteToken, "obtenerTokenCliente").mockReturnValue(
      "dev-cliente-token",
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <RedirectClienteAwayFromHub>
                <p>hub</p>
              </RedirectClienteAwayFromHub>
            }
          />
          <Route path="/cliente/docs" element={<p>docs cliente</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("docs cliente")).toBeInTheDocument();
    expect(screen.queryByText("hub")).not.toBeInTheDocument();
  });
});
