import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientePerfilPage } from "../../../src/features/docs-cliente/cliente-perfil-page";
import * as docsApi from "../../../src/features/docs/api/docs-api";

describe("ClientePerfilPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("carga el perfil y guarda nombre y correo", async () => {
    const user = userEvent.setup();
    vi.spyOn(docsApi, "fetchClienteProfile").mockResolvedValue({
      id: "demo",
      name: "Cliente Demo",
      email: "integraciones@clientedemo.com",
      status: "active",
      createdAt: "2026-10-10T00:00:00.000Z",
      updatedAt: "2026-10-10T00:00:00.000Z",
    });
    const updateSpy = vi
      .spyOn(docsApi, "updateClienteProfile")
      .mockResolvedValue({
        id: "demo",
        name: "Cliente Demo Editado",
        email: "nuevo@clientedemo.com",
        status: "active",
        createdAt: "2026-10-10T00:00:00.000Z",
        updatedAt: "2026-10-27T00:00:00.000Z",
      });

    render(
      <MemoryRouter>
        <ClientePerfilPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Mi perfil/i }),
      ).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/^Nombre$/i);
    const emailInput = screen.getByLabelText(/^Correo$/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Cliente Demo Editado");
    await user.clear(emailInput);
    await user.type(emailInput, "nuevo@clientedemo.com");
    await user.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        name: "Cliente Demo Editado",
        email: "nuevo@clientedemo.com",
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Perfil actualizado/i);
  });
});
