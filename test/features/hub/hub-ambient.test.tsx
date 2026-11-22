import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { resetAppsHealthCache } from "../../../src/features/hub/api/apps-health";
import { HubAmbientBackground } from "../../../src/features/hub/hub-ambient-background";
import { HubPage } from "../../../src/features/hub/hub-page";
import { AccessContext } from "../../../src/shared/auth/access-context";
import { createContextValueFromProfile } from "../../../src/shared/auth/access-context-base";
import {
  DEFAULT_APPS_CATALOG,
  buildFallbackAccessProfile,
} from "../../../src/shared/auth/access-types";
import {
  PREFERENCIAS_KEYS,
  guardarPreferenciaHubLayout,
  guardarPreferenciaMovimientoReducido,
} from "../../../src/shared/lib/ui-preferences";
import { safeStorage } from "../../../src/shared/lib/safe-storage";

describe("HubPage Escenario PS5", () => {
  beforeEach(() => {
    resetAppsHealthCache();
    safeStorage.removeItem(PREFERENCIAS_KEYS.HUB_LAYOUT);
    safeStorage.removeItem(PREFERENCIAS_KEYS.MOVIMIENTO);
    delete document.documentElement.dataset.movimiento;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
        }
        return new Response(
          JSON.stringify({ data: { counts: {}, layoutMeta: null } }),
          { status: 200 },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAppsHealthCache();
  });

  it("muestra por defecto el escenario PS5 con dock horizontal, crossfade en hover y cambio a editor Bento", async () => {
    const profile = buildFallbackAccessProfile("super.admin@coordinadora.com");

    render(
      <AccessContext.Provider
        value={createContextValueFromProfile({ ...profile, isSuperAdmin: true })}
      >
        <ThemeProvider>
          <MemoryRouter>
            <HubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    const ambient = await screen.findByTestId("hub-ambient-background");
    const spotlight = screen.getByTestId("hub-ps5-spotlight");
    const dock = screen.getByTestId("hub-ps5-dock");

    expect(dock).toBeInTheDocument();
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");
    expect(spotlight).toHaveTextContent("Diagnóstico de Migración");
    expect(spotlight).toHaveTextContent("Trazabilidad & Diagnóstico de Guías");

    const diagTile = screen.getByTestId("hub-ps5-tile-diagnostico");
    const logsTile = screen.getByTestId("hub-ps5-tile-logs");
    const auditTile = screen.getByTestId("hub-ps5-tile-auditoria");

    expect(diagTile).toHaveAttribute("data-active", "true");
    expect(diagTile).toHaveAttribute("data-ambient-state", "active");
    expect(diagTile).toHaveTextContent("Diagnóstico de Migración");
    expect(logsTile).toHaveAttribute("data-active", "false");
    expect(logsTile).toHaveAttribute("data-ambient-state", "dimmed");
    expect(logsTile).toHaveTextContent("Visor de Logs GKE");
    expect(logsTile.innerHTML).not.toContain("opacity-0");

    // Hover sobre Visor de Logs GKE actualiza spotlight, escalado y escena ambiental
    fireEvent.pointerEnter(logsTile);
    expect(ambient).toHaveAttribute("data-active-app-id", "logs");
    expect(logsTile).toHaveAttribute("data-active", "true");
    expect(diagTile).toHaveAttribute("data-ambient-state", "dimmed");
    expect(spotlight).toHaveTextContent("Visor de Logs GKE");
    expect(spotlight).toHaveTextContent("Observabilidad");

    // Al retirar el cursor, el spotlight mantiene la última herramienta activa
    fireEvent.pointerLeave(logsTile);
    expect(ambient).toHaveAttribute("data-active-app-id", "logs");

    // Ver estado muestra panel compacto de salud y uso
    fireEvent.click(screen.getByRole("button", { name: /ver estado/i }));
    expect(screen.getByTestId("hub-ps5-status-panel")).toHaveTextContent(
      /0 accesos/i,
    );

    // Las apps Próximamente también permiten previsualizar su spotlight y fondo
    fireEvent.pointerEnter(auditTile);
    expect(ambient).toHaveAttribute("data-active-app-id", "auditoria");
    expect(spotlight).toHaveTextContent("Auditoría de Facturación");
    expect(spotlight).toHaveTextContent("Próximamente");

    // El modo PS5 omite los botones Personalizar portal y Vista cuadrícula
    expect(
      screen.queryByRole("button", { name: /personalizar portal/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /vista cuadrícula/i }),
    ).not.toBeInTheDocument();
  });

  it("navega cíclicamente por el dock con ArrowRight y ArrowLeft moviendo foco, fondo y spotlight", async () => {
    const profile = buildFallbackAccessProfile("operador@coordinadora.com");

    render(
      <AccessContext.Provider value={createContextValueFromProfile(profile)}>
        <ThemeProvider>
          <MemoryRouter>
            <HubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    const ambient = await screen.findByTestId("hub-ambient-background");
    const spotlight = screen.getByTestId("hub-ps5-spotlight");
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(ambient).toHaveAttribute("data-active-app-id", "logs");
    expect(spotlight).toHaveTextContent("Visor de Logs GKE");
    expect(document.activeElement).toBe(
      screen.getByTestId("hub-ps5-tile-logs"),
    );

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");
    expect(spotlight).toHaveTextContent("Diagnóstico de Migración");
    expect(document.activeElement).toBe(
      screen.getByTestId("hub-ps5-tile-diagnostico"),
    );

    // ArrowLeft en el primer elemento envuelve hacia el último elemento del dock
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(ambient).toHaveAttribute("data-active-app-id", "auditoria");
    expect(document.activeElement).toBe(
      screen.getByTestId("hub-ps5-tile-auditoria"),
    );
  });

  it("mantiene el ambiente reactivo y navegación con flechas sin barra spotlight en Cuadrícula Bento clásica y respeta reduced motion", async () => {
    guardarPreferenciaHubLayout("bento");
    guardarPreferenciaMovimientoReducido(true);
    const profile = buildFallbackAccessProfile("super.admin@coordinadora.com");

    render(
      <AccessContext.Provider
        value={createContextValueFromProfile({ ...profile, isSuperAdmin: true })}
      >
        <ThemeProvider>
          <MemoryRouter>
            <HubPage />
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    const ambient = await screen.findByTestId("hub-ambient-background");
    expect(screen.queryByTestId("hub-bento-spotlight")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hub-ps5-dock")).not.toBeInTheDocument();
    expect(ambient).toHaveAttribute("data-active-app-id", "");
    expect(document.documentElement.dataset.movimiento).toBe("reducido");

    const diagCard = screen
      .getByRole("heading", { name: "Diagnóstico de Migración" })
      .closest("article")!;
    const logsCard = screen
      .getByRole("heading", { name: "Visor de Logs GKE" })
      .closest("article")!;
    const auditCard = screen
      .getByRole("heading", { name: "Auditoría de Facturación" })
      .closest("article")!;

    fireEvent.pointerEnter(diagCard);
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");
    expect(diagCard).toHaveAttribute("data-ambient-state", "active");
    expect(logsCard).toHaveAttribute("data-ambient-state", "dimmed");

    // Una app deshabilitada (Próximamente) no altera el ambiente en Cuadrícula Bento
    fireEvent.pointerLeave(diagCard);
    expect(ambient).toHaveAttribute("data-active-app-id", "");
    fireEvent.pointerEnter(auditCard);
    expect(ambient).toHaveAttribute("data-active-app-id", "");

    // Navegación cíclica por teclado entre tarjetas activas
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(ambient).toHaveAttribute("data-active-app-id", "logs");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");

    // Al entrar a Personalizar portal se desactiva el ambiente para no interferir con edición Bento
    fireEvent.click(
      screen.getByRole("button", { name: /personalizar portal/i }),
    );
    expect(
      screen.queryByTestId("hub-ambient-background"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-bento-spotlight"),
    ).not.toBeInTheDocument();
  });

  it("ignora ArrowRight y ArrowLeft cuando existe un diálogo abierto o defaultPrevented", async () => {
    const profile = buildFallbackAccessProfile("operador@coordinadora.com");
    const renderView = (withDialog: boolean) => (
      <AccessContext.Provider value={createContextValueFromProfile(profile)}>
        <ThemeProvider>
          <MemoryRouter>
            <HubPage />
            {withDialog && (
              <div role="dialog" aria-modal="true" aria-label="Paleta abierta">
                Contenido modal
              </div>
            )}
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>
    );

    const { rerender } = render(renderView(true));

    const ambient = await screen.findByTestId("hub-ambient-background");
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");

    // Retirar el diálogo y comprobar que defaultPrevented también evita la navegación
    rerender(renderView(false));
    const preventedEvent = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      cancelable: true,
    });
    preventedEvent.preventDefault();
    window.dispatchEvent(preventedEvent);

    expect(ambient).toHaveAttribute("data-active-app-id", "diagnostico");
  });

  it("no monta <img> sin manifiesto y cuando existen assets carga solo activa y vecinas", () => {
    const { container, rerender } = render(
      <ThemeProvider>
        <HubAmbientBackground
          apps={DEFAULT_APPS_CATALOG}
          activeAppId="backends"
        />
      </ThemeProvider>,
    );

    // Manifiesto vacío por defecto: cero peticiones .webp
    expect(container.querySelectorAll("img")).toHaveLength(0);

    const manifest = new Set([
      "/hub-ambient/diagnostico.webp",
      "/hub-ambient/logs.webp",
      "/hub-ambient/backends.webp",
      "/hub-ambient/docs.webp",
      "/hub-ambient/auditoria.webp",
    ]);

    rerender(
      <ThemeProvider>
        <HubAmbientBackground
          apps={DEFAULT_APPS_CATALOG}
          activeAppId="backends"
          availableImages={manifest}
        />
      </ThemeProvider>,
    );

    const mountedSrcs = Array.from(container.querySelectorAll("img")).map(
      (img) => img.getAttribute("src"),
    );
    expect(mountedSrcs).toEqual([
      "/hub-ambient/logs.webp",
      "/hub-ambient/backends.webp",
      "/hub-ambient/docs.webp",
    ]);
  });
});
