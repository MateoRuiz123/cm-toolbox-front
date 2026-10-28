import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClienteDocsRoutes } from "../../../src/features/docs-cliente/cliente-docs-routes";
import * as clienteSession from "../../../src/features/docs-cliente/auth/cliente-session";
import * as docsApi from "../../../src/features/docs/api/docs-api";

vi.mock("../../../src/features/docs/docs-page", () => ({
  DocsPage: () => <p>catálogo cliente</p>,
}));

vi.mock("../../../src/features/docs/docs-viewer-page", () => ({
  DocsViewerPage: () => <p>visor cliente</p>,
}));

describe("ClienteDocsRoutes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el catálogo en /cliente/docs (splat relativo)", async () => {
    vi.spyOn(clienteSession, "ensureClienteSession").mockResolvedValue(
      "authenticated",
    );
    vi.spyOn(docsApi, "fetchDocsCatalog").mockResolvedValue([]);
    vi.spyOn(docsApi, "fetchClienteProfile").mockResolvedValue({
      id: "demo",
      name: "Cliente Demo",
      email: "integraciones@clientedemo.com",
      status: "active",
      createdAt: "2026-10-10T00:00:00.000Z",
      updatedAt: "2026-10-10T00:00:00.000Z",
    });

    render(
      <MemoryRouter initialEntries={["/cliente/docs"]}>
        <Routes>
          <Route path="/cliente/*" element={<ClienteDocsRoutes />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("catálogo cliente")).toBeInTheDocument();
    });
  });

  it("renderiza el perfil en /cliente/perfil", async () => {
    vi.spyOn(clienteSession, "ensureClienteSession").mockResolvedValue(
      "authenticated",
    );
    vi.spyOn(docsApi, "fetchClienteProfile").mockResolvedValue({
      id: "demo",
      name: "Cliente Demo",
      email: "integraciones@clientedemo.com",
      status: "active",
      createdAt: "2026-10-10T00:00:00.000Z",
      updatedAt: "2026-10-10T00:00:00.000Z",
    });

    render(
      <MemoryRouter initialEntries={["/cliente/perfil"]}>
        <Routes>
          <Route path="/cliente/*" element={<ClienteDocsRoutes />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Mi perfil/i }),
      ).toBeInTheDocument();
    });
  });
});
