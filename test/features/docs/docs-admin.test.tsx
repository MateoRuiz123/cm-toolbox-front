import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccessContext,
  type AccessContextValue,
} from "../../../src/shared/auth/access-context";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";
import { DocsPage } from "../../../src/features/docs/docs-page";
import { DocsAdminPage } from "../../../src/features/docs/admin/docs-admin-page";
import { DocsNewApiPage } from "../../../src/features/docs/admin/new-api-form";
import { ClientsPage } from "../../../src/features/docs/admin/clients-page";
import { EditApiForm } from "../../../src/features/docs/admin/edit-api-form";
import * as docsApi from "../../../src/features/docs/api/docs-api";

const makeAccessContext = (canManage: boolean): AccessContextValue => {
  const profile = buildFallbackAccessProfile("user@coordinadora.com");
  return {
    profile: {
      ...profile,
      isSuperAdmin: canManage,
      roleId: canManage ? "admin" : "user",
    },
    roleId: canManage ? "admin" : "user",
    isSuperAdmin: canManage,
    canManageApps: canManage,
    canManageUsers: canManage,
    apps: profile.apps,
    loadingAccess: false,
    isUserBlocked: false,
    blockedMessage: null,
    devImpersonatedEmail: null,
    canAccessApp: () => true,
    canPerformAction: (_appId, action) =>
      action === "manage" ? canManage : true,
    refreshAccess: async () => undefined,
    switchDevUser: async () => undefined,
  };
};

describe("Docs Admin UI & CA-A07", () => {
  beforeEach(() => {
    vi.spyOn(docsApi, "fetchDocsCatalog").mockResolvedValue([]);
    vi.spyOn(docsApi, "fetchAdminClients").mockResolvedValue([
      {
        id: "demo",
        name: "Cliente Demo",
        email: "demo@cliente.com",
        status: "active",
        createdAt: "2026-10-10T00:00:00.000Z",
        updatedAt: "2026-10-10T00:00:00.000Z",
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("CA-A07: usuario sin manage no ve 'Nueva documentación' ni 'Clientes' en /docs ni en /docs/admin", async () => {
    render(
      <AccessContext.Provider value={makeAccessContext(false)}>
        <MemoryRouter>
          <DocsPage canManage={false} />
          <DocsAdminPage />
        </MemoryRouter>
      </AccessContext.Provider>,
    );

    await waitFor(() => {
      expect(docsApi.fetchDocsCatalog).toHaveBeenCalled();
    });

    expect(
      screen.queryByRole("link", { name: /Nueva documentación/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Clientes/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Administrar/i }),
    ).not.toBeInTheDocument();
  });

  it("usuario con manage ve accesos a 'Nueva documentación' y 'Clientes' en /docs/admin", () => {
    render(
      <AccessContext.Provider value={makeAccessContext(true)}>
        <MemoryRouter>
          <DocsAdminPage />
        </MemoryRouter>
      </AccessContext.Provider>,
    );

    expect(
      screen.getByRole("heading", { name: /Administración de documentación/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ir a Nueva documentación/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ir a Clientes/i }),
    ).toBeInTheDocument();
  });

  it("ClientsPage crea cliente y muestra activationUrl y copy de éxito", async () => {
    vi.spyOn(docsApi, "createAdminClient").mockResolvedValue({
      id: "900123456",
      name: "Cliente Prueba",
      email: "prueba@cliente.com",
      status: "pending",
      createdAt: "2026-10-23T00:00:00.000Z",
      updatedAt: "2026-10-23T00:00:00.000Z",
      activationUrl:
        "http://localhost:3000/cliente/login?client=900123456&activation_token=abc",
    });

    render(
      <AccessContext.Provider value={makeAccessContext(true)}>
        <MemoryRouter>
          <ClientsPage />
        </MemoryRouter>
      </AccessContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Cliente Demo")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("NIT"), {
      target: { value: "900123456" },
    });
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Cliente Prueba" },
    });
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "prueba@cliente.com" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Crear y enviar activación/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Se envió el enlace para que el cliente cree su contraseña\./i,
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/activation_token=abc/i)).toBeInTheDocument();
  });

  it("EditApiForm carga metadatos y envía PATCH al guardar", async () => {
    vi.spyOn(docsApi, "fetchApiDetail").mockResolvedValue({
      id: "api-demo",
      name: "API Demo",
      description: "Desc original",
      version: "1.0.0",
      updatedAt: "2026-10-10T00:00:00.000Z",
      audiences: ["internal"],
    });
    const patchSpy = vi.spyOn(docsApi, "updateAdminApi").mockResolvedValue({
      id: "api-demo",
      name: "API Demo Renombrada",
      description: "Nueva desc",
      version: "1.0.0",
      updatedAt: "2026-10-23T00:00:00.000Z",
      audiences: ["internal", "client:demo"],
    });

    render(<EditApiForm apiId="api-demo" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("API Demo")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("API Demo"), {
      target: { value: "API Demo Renombrada" },
    });
    fireEvent.change(screen.getByDisplayValue("Desc original"), {
      target: { value: "Nueva desc" },
    });
    fireEvent.click(screen.getByLabelText(/Cliente Demo \(client:demo\)/i));
    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith("api-demo", {
        name: "API Demo Renombrada",
        description: "Nueva desc",
        audiences: ["internal", "client:demo"],
      });
    });
    expect(
      screen.getByText(/Documentación actualizada correctamente\./i),
    ).toBeInTheDocument();
  });

  it("DocsNewApiPage crea API nueva y navega a /docs/:apiId", async () => {
    const createSpy = vi.spyOn(docsApi, "createAdminApi").mockResolvedValue({
      id: "api-nueva",
      name: "API Nueva",
      version: "1.0.0",
      updatedAt: "2026-10-23T00:00:00.000Z",
      audiences: ["internal"],
    });

    render(
      <AccessContext.Provider value={makeAccessContext(true)}>
        <MemoryRouter initialEntries={["/docs/admin/nueva"]}>
          <Routes>
            <Route path="/docs/admin/nueva" element={<DocsNewApiPage />} />
            <Route
              path="/docs/:apiId"
              element={<div>Detalle API Creada</div>}
            />
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>,
    );

    fireEvent.change(screen.getByLabelText(/Nombre \*/i), {
      target: { value: "API Nueva" },
    });

    const file = new File(
      [
        '{"openapi":"3.0.3","info":{"title":"Nueva","version":"1.0.0"},"paths":{}}',
      ],
      "openapi.json",
      { type: "application/json" },
    );
    fireEvent.change(screen.getByLabelText("Archivo OpenAPI"), {
      target: { files: [file] },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Crear documentación/i }),
    );

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
      expect(screen.getByText("Detalle API Creada")).toBeInTheDocument();
    });
  });
});
