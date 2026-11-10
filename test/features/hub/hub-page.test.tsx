import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { HubPage } from "../../../src/features/hub/hub-page";
import { AccessContext } from "../../../src/shared/auth/access-context";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";

describe("HubPage", () => {
  it("renderiza la tarjeta de Diagnóstico de Migración con enlace hacia /diagnostico", () => {
    const html = renderToString(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <HubPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(html).toContain("Portal de Aplicaciones de Apoyo");
    expect(html).toContain("Diagnóstico de Migración");
    expect(html).toContain('href="/diagnostico"');
    expect(html).toContain("Abrir herramienta");
  });

  it("renderiza la tarjeta Visor de Logs GKE con enlace hacia /logs", () => {
    const html = renderToString(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <HubPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(html).toContain("Visor de Logs GKE");
    expect(html).toContain('href="/logs"');
  });

  it("muestra tarjetas de próximas aplicaciones en estado deshabilitado", () => {
    const html = renderToString(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <HubPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(html).toContain("Auditoría de Facturación");
    expect(html).toContain("Próximamente");
    expect(html).toContain("En construcción");
  });

  it("no pinta una app hidden y sí pinta una disabled como Próximamente", () => {
    const profile = buildFallbackAccessProfile();
    const apps = profile.apps.map((app) =>
      app.id === "logs"
        ? { ...app, status: "hidden" as const, canAccess: false }
        : app,
    );
    const html = renderToString(
      <AccessContext.Provider
        value={{
          profile: { ...profile, apps },
          roleId: profile.roleId,
          isSuperAdmin: true,
          canManageApps: true,
          canManageUsers: true,
          apps,
          loadingAccess: false,
          isUserBlocked: false,
          blockedMessage: null,
          devImpersonatedEmail: null,
          canAccessApp: (appId) =>
            apps.find((a) => a.id === appId)?.canAccess ?? false,
          canPerformAction: () => false,
          refreshAccess: async () => undefined,
          switchDevUser: async () => undefined,
        }}
      >
        <ThemeProvider>
          <MemoryRouter>
            <HubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(html).not.toContain("Visor de Logs GKE");
    expect(html).toContain("Auditoría de Facturación");
    expect(html).toContain("Próximamente");
  });

  it("no lista herramientas mientras loadingAccess es true", () => {
    const profile = buildFallbackAccessProfile();
    const html = renderToString(
      <AccessContext.Provider
        value={{
          profile,
          roleId: profile.roleId,
          isSuperAdmin: true,
          canManageApps: true,
          canManageUsers: true,
          apps: profile.apps,
          loadingAccess: true,
          isUserBlocked: false,
          blockedMessage: null,
          devImpersonatedEmail: null,
          canAccessApp: () => true,
          canPerformAction: () => false,
          refreshAccess: async () => undefined,
          switchDevUser: async () => undefined,
        }}
      >
        <ThemeProvider>
          <MemoryRouter>
            <HubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(html).toContain("Cargando herramientas");
    expect(html).not.toContain("Diagnóstico de Migración");
  });
});
