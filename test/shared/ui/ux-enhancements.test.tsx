import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { LoginScreen } from "../../../src/features/auth/login-screen";
import { AccessContext } from "../../../src/shared/auth/access-context";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";
import { AppBootScreen } from "../../../src/shared/ui/app-boot-screen";
import { CommandPalette } from "../../../src/shared/ui/command-palette";
import { RouteSkeletonFallback } from "../../../src/shared/ui/route-skeleton-fallback";

describe("UX Enhancements: Loading, Landing & CommandPalette", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("AppBootScreen mantiene el estado accesible de verificación SSO", () => {
    render(<AppBootScreen />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByText(/verificando credenciales corporativas/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/autenticación corporativa sso/i)).toBeInTheDocument();
  });

  it("RouteSkeletonFallback renderiza variantes con indicador accesible Cargando…", () => {
    render(<RouteSkeletonFallback variant="diagnostico" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-skeleton-variant", "diagnostico");
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("LoginScreen muestra landing corporativa, enlace a /cliente/login y dispara onLogin en un solo clic", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn(async () => undefined);

    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginScreen onLogin={onLogin} />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByText("Diagnóstico de Migración")).toBeInTheDocument();
    expect(screen.getByText("Visor de Logs GKE")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /portal de documentación para clientes/i,
      }),
    ).toHaveAttribute("href", "/cliente/login");

    await user.click(
      screen.getByRole("button", { name: /iniciar sesión con google/i }),
    );
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("CommandPalette abre con Ctrl+K, filtra comandos, navega y envía reporte rápido", async () => {
    const user = userEvent.setup();
    const profile = buildFallbackAccessProfile("operador@coordinadora.com");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            ticketId: "INC-CMD-99",
            createdAt: new Date().toISOString(),
            status: "sent",
            notifiedWebhook: false,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AccessContext.Provider
        value={{
          profile,
          roleId: profile.roleId,
          isSuperAdmin: true,
          canManageApps: true,
          canManageUsers: true,
          apps: profile.apps,
          loadingAccess: false,
          isUserBlocked: false,
          blockedMessage: null,
          devImpersonatedEmail: null,
          canAccessApp: () => true,
          canPerformAction: () => true,
          refreshAccess: async () => undefined,
          switchDevUser: async () => undefined,
        }}
      >
        <ThemeProvider>
          <MemoryRouter initialEntries={["/"]}>
            <CommandPalette />
            <Routes>
              <Route path="/" element={<div>Vista Portal</div>} />
              <Route path="/logs" element={<div>Vista Logs Destino</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const searchInput = await screen.findByLabelText(
      /buscar herramienta, ruta o acción rápida/i,
    );
    await user.type(searchInput, "Reportar fallo en Visor");
    await user.click(
      screen.getByRole("button", { name: /reportar fallo en visor de logs gke/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/INC-CMD-99/)).toBeInTheDocument();
    });

    await user.clear(searchInput);
    await user.type(searchInput, "Visor de Logs GKE");
    await user.click(
      screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Visor de Logs GKE") && btn.textContent?.includes("/logs"))!,
    );

    expect(await screen.findByText("Vista Logs Destino")).toBeInTheDocument();
  });
});
