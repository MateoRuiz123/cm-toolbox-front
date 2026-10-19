import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { HubPage } from "../../../src/features/hub/hub-page";

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
});
