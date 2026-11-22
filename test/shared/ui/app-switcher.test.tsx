import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";
import { AppSwitcher } from "../../../src/shared/ui/app-switcher";

const makeManyApps = (count: number) => {
  const base = buildFallbackAccessProfile().apps;
  const extras = Array.from({ length: count }, (_, idx) => ({
    id: `herramienta-${idx + 1}`,
    name: `Herramienta Extra ${idx + 1}`,
    description: `Módulo operativo ${idx + 1}`,
    route: `/herramienta-${idx + 1}`,
    icon: "auditoria" as const,
    tags: idx === 2 ? ["Tarifas", "Fletes"] : ["Operación"],
    status: "active" as const,
    displayOrder: 50 + idx,
    canAccess: true,
    allowedActions: ["view"],
  }));
  return [...base, ...extras];
};

describe("AppSwitcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("abre y cierra el selector desde el breadcrumb, marca app actual, oculta disabled/hidden y navega con teclado", async () => {
    const user = userEvent.setup();
    const apps = buildFallbackAccessProfile().apps;

    render(
      <MemoryRouter initialEntries={["/diagnostico"]}>
        <AppSwitcher apps={apps} currentPath="/diagnostico" />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", {
      name: /cambiar de herramienta \(diagnóstico de migración\)/i,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const diagOption = screen.getByRole("option", {
      name: /diagnóstico de migración/i,
    });
    expect(diagOption).toHaveAttribute("aria-current", "page");

    // auditoria está disabled y no debe listarse en el selector
    expect(
      screen.queryByRole("option", { name: /auditoría de facturación/i }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /ver todas en el portal/i }),
    ).toHaveAttribute("href", "/");

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("abre el desplegable desde el breadcrumb cuando hay más de 8 apps con buscador y sin barra de pastillas", async () => {
    const user = userEvent.setup();
    const manyApps = makeManyApps(6);

    render(
      <MemoryRouter initialEntries={["/logs"]}>
        <AppSwitcher apps={manyApps} currentPath="/logs" />
        <Routes>
          <Route path="/logs" element={<div>Logs</div>} />
          <Route path="/herramienta-3" element={<div>Destino 3</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("navigation", { name: /cambiar de herramienta/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Más" })).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /cambiar de herramienta \(visor de logs gke\)/i,
      }),
    );

    const searchInput = await screen.findByLabelText(
      /filtrar herramientas disponibles/i,
    );
    await user.type(searchInput, "Tarifas");

    const filteredOption = screen.getByRole("option", {
      name: /herramienta extra 3/i,
    });
    expect(filteredOption).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /herramienta extra 1/i }),
    ).not.toBeInTheDocument();

    await user.click(filteredOption);
    expect(await screen.findByText("Destino 3")).toBeInTheDocument();
  });
});
