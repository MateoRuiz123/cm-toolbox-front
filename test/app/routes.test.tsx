import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "../../src/app/theme-provider";
import { AppRoutes } from "../../src/app/app";

const renderRoute = (path: string) =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Suspense fallback={<span>Cargando…</span>}>
          <AppRoutes />
        </Suspense>
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("AppRoutes", () => {
  it("mantiene /hub como alias del portal", () => {
    renderRoute("/hub");

    expect(
      screen.getByRole("heading", { name: /portal de aplicaciones de apoyo/i }),
    ).toBeInTheDocument();
  });

  it("resuelve la herramienta de diagnóstico en rutas anidadas", async () => {
    renderRoute("/diagnostico/historial");

    expect(
      await screen.findByRole("heading", { name: /diagnóstico de migración/i }),
    ).toBeInTheDocument();
  });

  it("muestra 404 para rutas desconocidas", () => {
    renderRoute("/ruta-inexistente");

    expect(
      screen.getByText("La página solicitada no está disponible"),
    ).toBeInTheDocument();
  });
});
