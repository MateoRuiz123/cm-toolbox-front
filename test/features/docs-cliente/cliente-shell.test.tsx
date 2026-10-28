import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClienteShell } from "../../../src/features/docs-cliente/cliente-shell";
import * as docsApi from "../../../src/features/docs/api/docs-api";

describe("ClienteShell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra chip de perfil cuando hay sesión y onLogout", async () => {
    vi.spyOn(docsApi, "fetchClienteProfile").mockResolvedValue({
      id: "demo",
      name: "Cliente Demo",
      email: "integraciones@clientedemo.com",
      status: "active",
      createdAt: "2026-10-10T00:00:00.000Z",
      updatedAt: "2026-10-10T00:00:00.000Z",
    });

    render(
      <MemoryRouter>
        <ClienteShell onLogout={() => undefined}>
          <p>contenido</p>
        </ClienteShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /Perfil de Cliente Demo/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("integraciones@clientedemo.com"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it("sin onLogout no pide perfil", () => {
    const spy = vi.spyOn(docsApi, "fetchClienteProfile");
    render(
      <MemoryRouter>
        <ClienteShell>
          <p>login</p>
        </ClienteShell>
      </MemoryRouter>,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
