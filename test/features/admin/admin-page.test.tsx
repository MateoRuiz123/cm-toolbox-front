import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "../../../src/features/admin/admin-page";
import {
  AccessContext,
  type AccessContextValue,
} from "../../../src/shared/auth/access-context";
import { AppAccessGuard } from "../../../src/shared/auth/app-access-guard";
import { DynamicAppRoutePage } from "../../../src/shared/auth/dynamic-app-route-page";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";

const buildMockContext = (
  overrides: Partial<AccessContextValue> = {},
): AccessContextValue => {
  const profile = buildFallbackAccessProfile();
  return {
    profile,
    roleId: profile.roleId,
    isSuperAdmin: profile.isSuperAdmin,
    canManageApps: profile.canManageApps,
    canManageUsers: profile.canManageUsers,
    apps: profile.apps,
    loadingAccess: false,
    isUserBlocked: false,
    blockedMessage: null,
    devImpersonatedEmail: null,
    canAccessApp: (appId) =>
      profile.apps.find((a) => a.id === appId)?.canAccess ?? false,
    canPerformAction: () => true,
    refreshAccess: async () => undefined,
    switchDevUser: async () => undefined,
    ...overrides,
  };
};

describe("AdminPage y AppAccessGuard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el título accesible de Administración, KPIs, pestañas y carga usuarios, roles y aplicaciones", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/admin/apps")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: "diagnostico",
                name: "Diagnóstico de Migración",
                description: "Diagnóstico",
                route: "/diagnostico",
                icon: "diagnostico",
                tags: [],
                status: "active",
                displayOrder: 10,
                updatedBy: "system",
                updatedAt: "2026-10-18T00:00:00.000Z",
                actions: [
                  {
                    actionCode: "view",
                    name: "Consultar diagnóstico",
                    description: null,
                    defaultRoles: ["admin", "user"],
                  },
                ],
              },
            ],
          }),
        } as Response;
      }
      if (url.includes("/admin/roles")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: "admin",
                name: "Administrador",
                description: "Control total",
                hierarchyLevel: 100,
                canManageApps: true,
                canManageUsers: true,
                isSystemRole: true,
                usersCount: 1,
                defaultPermissions: [],
              },
            ],
          }),
        } as Response;
      }
      if (url.includes("/admin/users")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: "u1",
                email: "dev.local@coordinadora.com",
                displayName: "Dev Admin",
                roleId: "admin",
                isSuperAdmin: true,
                isBlocked: false,
                notes: null,
                updatedBy: "system",
                updatedAt: "2026-10-18T00:00:00.000Z",
                permissions: [],
              },
            ],
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { total: 0, items: [] } }),
      } as Response;
    });

    render(
      <MemoryRouter>
        <AccessContext.Provider value={buildMockContext()}>
          <AdminPage />
        </AccessContext.Provider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /Administración de Accesos y Aplicaciones/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("tab", { name: /Roles y Plantillas/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("dev.local@coordinadora.com"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/✓ Diagnóstico de Migración/i),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: /Auditoría/i }));
    expect(
      screen.getByText(/No hay eventos de auditoría registrados/i),
    ).toBeInTheDocument();
  });

  it("CA-F03: AppAccessGuard bloquea navegación directa cuando canAccessApp es false", () => {
    const restrictedCtx = buildMockContext({
      canAccessApp: () => false,
    });

    render(
      <MemoryRouter>
        <AccessContext.Provider value={restrictedCtx}>
          <AppAccessGuard appId="logs">
            <div>Contenido Secreto</div>
          </AppAccessGuard>
        </AccessContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Contenido Secreto")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Permiso requerido para esta herramienta/i,
      }),
    ).toBeInTheDocument();
  });

  it("DynamicAppRoutePage renderiza automáticamente la vista protegida para una herramienta registrada en BD", () => {
    const customApp = {
      id: "validador-tarifas",
      name: "Validador de Tarifas",
      description: "Validación automática de fletes.",
      route: "/validador-tarifas",
      icon: "auditoria" as const,
      tags: ["Fletes", "SAP"],
      status: "active" as const,
      displayOrder: 40,
      canAccess: true,
      allowedActions: ["view", "export_csv"],
    };

    const ctx = buildMockContext({
      apps: [customApp],
      canAccessApp: (id) => id === "validador-tarifas",
    });

    render(
      <MemoryRouter initialEntries={["/validador-tarifas"]}>
        <AccessContext.Provider value={ctx}>
          <DynamicAppRoutePage app={customApp} />
        </AccessContext.Provider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /Validador de Tarifas/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/✓ export_csv/i)).toBeInTheDocument();
  });
});
