import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { guardarConsultaSesion } from "../../../src/features/diagnostico/consulta-sesion";
import { resetAppsHealthCache } from "../../../src/features/hub/api/apps-health";
import { HubPage } from "../../../src/features/hub/hub-page";
import { AccessContext } from "../../../src/shared/auth/access-context";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";

const createAccessValue = (
  overrides?: Partial<{
    readonly isSuperAdmin: boolean;
    readonly refreshAccess: () => Promise<void>;
  }>,
) => {
  const profile = buildFallbackAccessProfile("super.admin@coordinadora.com");
  const isSuperAdmin = overrides?.isSuperAdmin ?? true;
  return {
    profile: { ...profile, isSuperAdmin },
    roleId: isSuperAdmin ? "admin" : "user",
    isSuperAdmin,
    canManageApps: isSuperAdmin,
    canManageUsers: isSuperAdmin,
    apps: profile.apps,
    loadingAccess: false,
    isUserBlocked: false,
    blockedMessage: null,
    devImpersonatedEmail: null,
    canAccessApp: (appId: string) =>
      profile.apps.find((a) => a.id === appId)?.canAccess ?? false,
    canPerformAction: () => isSuperAdmin,
    refreshAccess: overrides?.refreshAccess ?? (async () => undefined),
    switchDevUser: async () => undefined,
  };
};

describe("HubPage Bento, Health Check y Editor", () => {
  beforeEach(() => {
    resetAppsHealthCache();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetAppsHealthCache();
  });

  it("muestra alerta de servicio caído, advertencia 'Abrir de todos modos' y envía reporte automático", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/diagnostico-api/health") {
        return new Response(JSON.stringify({ status: "unhealthy" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/health")) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/apps/usage-ranking")) {
        return new Response(
          JSON.stringify({
            data: {
              counts: { logs: 9, diagnostico: 2 },
              layoutMeta: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/incidents/report") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: {
              ticketId: "INC-AUTO-001",
              createdAt: new Date().toISOString(),
              status: "sent",
              notifiedWebhook: true,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ data: { recorded: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AccessContext.Provider value={createAccessValue({ isSuperAdmin: false })}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<HubPage />} />
              <Route
                path="/diagnostico"
                element={<div>Destino Diagnóstico</div>}
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(
      screen.queryByRole("button", { name: /personalizar portal/i }),
    ).not.toBeInTheDocument();

    expect(await screen.findByText(/fuera de línea/i)).toBeInTheDocument();
    expect(screen.getByText(/incidencia detectada/i)).toBeInTheDocument();

    const diagButton = screen.getByRole("button", {
      name: /abrir herramienta \(diagnóstico de migración fuera de línea/i,
    });
    expect(diagButton).toHaveAttribute("aria-disabled", "true");

    await user.click(diagButton);

    expect(
      await screen.findByRole("dialog"),
    ).toHaveTextContent(/diagnóstico de migración podría no responder/i);

    const modalReportBtn = screen
      .getByRole("dialog")
      .querySelector("button:nth-of-type(2)");
    expect(modalReportBtn).toBeTruthy();

    await user.click(
      screen.getAllByRole("button", {
        name: /reportar fallo automáticamente/i,
      })[0],
    );

    await waitFor(() => {
      expect(screen.getAllByText(/INC-AUTO-001/).length).toBeGreaterThan(0);
    });

    await user.click(
      screen.getByRole("button", { name: /abrir de todos modos/i }),
    );

    expect(await screen.findByText("Destino Diagnóstico")).toBeInTheDocument();
  });

  it("permite a SuperAdmin personalizar orden/tamaño Bento, alternar ranking 'Más usadas' y mostrar 'Continuar consulta'", async () => {
    const user = userEvent.setup();
    const refreshAccess = vi.fn(async () => undefined);
    guardarConsultaSesion({ remisiones: "70001234", despachos: "" });

    const savedBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/health")) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/apps/usage-ranking")) {
        return new Response(
          JSON.stringify({
            data: {
              counts: { logs: 15, diagnostico: 3 },
              layoutMeta: { diagnostico: "featured", logs: "wide" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/admin/apps/order") && init?.method === "PUT") {
        savedBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return new Response(JSON.stringify({ data: { updated: 4 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AccessContext.Provider
        value={createAccessValue({ isSuperAdmin: true, refreshAccess })}
      >
        <ThemeProvider>
          <MemoryRouter initialEntries={["/"]}>
            <HubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(
      await screen.findByText(/continuar consulta: 70001234/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /más usadas/i }));
    await waitFor(() => {
      const headings = screen
        .getAllByRole("heading", { level: 2 })
        .map((node) => node.textContent);
      expect(headings[0]).toBe("Visor de Logs GKE");
    });

    await user.click(screen.getByRole("button", { name: /orden del portal/i }));

    await user.click(
      screen.getByRole("button", { name: /personalizar portal/i }),
    );
    expect(
      screen.getByText(/modo editor del portal \(superadmin\)/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /mover diagnóstico de migración hacia adelante/i,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: /tamaño compacta para diagnóstico de migración/i,
      }),
    );

    await user.click(screen.getByRole("button", { name: /guardar para todos/i }));

    await waitFor(() => {
      expect(savedBodies).toHaveLength(1);
    });
    expect(refreshAccess).toHaveBeenCalledTimes(1);
    expect(
      (savedBodies[0].layoutMeta as Record<string, string>).diagnostico,
    ).toBe("standard");
  });
});
