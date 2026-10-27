import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { ConfiguracionPage } from "../../../src/features/configuracion/configuracion-page";
import { PREFERENCIAS_KEYS } from "../../../src/shared/lib/ui-preferences";
import { safeStorage } from "../../../src/shared/lib/safe-storage";

const renderPagina = () =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/configuracion"]}>
        <ConfiguracionPage />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("ConfiguracionPage", () => {
  beforeEach(() => {
    safeStorage.removeItem(PREFERENCIAS_KEYS.SISTEMA);
    safeStorage.removeItem(PREFERENCIAS_KEYS.THEME);
    safeStorage.removeItem(PREFERENCIAS_KEYS.DESCANSO);
    safeStorage.removeItem(PREFERENCIAS_KEYS.MOVIMIENTO);
    delete document.documentElement.dataset.sistema;
    delete document.documentElement.dataset.descanso;
    delete document.documentElement.dataset.movimiento;
    document.documentElement.classList.remove("dark");
  });

  it("muestra el título accesible y deja SIGO activo por defecto", () => {
    renderPagina();

    expect(
      screen.getByRole("heading", { name: /apariencia del toolbox/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /sigo droop/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(document.documentElement.dataset.sistema).toBeUndefined();
  });

  it("marca Visitors en el documento y vuelve a SIGO", async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(screen.getByRole("radio", { name: /visitors/i }));

    expect(screen.getByRole("radio", { name: /visitors/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(document.documentElement.dataset.sistema).toBe("visitors");
    expect(safeStorage.getItem(PREFERENCIAS_KEYS.SISTEMA)).toBe("visitors");

    await user.click(screen.getByRole("radio", { name: /sigo droop/i }));

    expect(document.documentElement.dataset.sistema).toBeUndefined();
    expect(safeStorage.getItem(PREFERENCIAS_KEYS.SISTEMA)).toBe("sigo");
  });

  it("marca Glass Spatial en el documento y lo persiste", async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(screen.getByRole("radio", { name: /glass spatial/i }));

    expect(
      screen.getByRole("radio", { name: /glass spatial/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.sistema).toBe("glass");
    expect(safeStorage.getItem(PREFERENCIAS_KEYS.SISTEMA)).toBe("glass");
  });

  it("activa y desactiva el descanso visual cálido", async () => {
    const user = userEvent.setup();
    renderPagina();

    const interruptor = screen.getByRole("switch", {
      name: /descanso visual/i,
    });
    expect(interruptor).toHaveAttribute("aria-checked", "false");

    await user.click(interruptor);

    expect(interruptor).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.descanso).toBe("calido");
    expect(safeStorage.getItem(PREFERENCIAS_KEYS.DESCANSO)).toBe("calido");

    await user.click(interruptor);

    expect(document.documentElement.dataset.descanso).toBeUndefined();
    expect(safeStorage.getItem(PREFERENCIAS_KEYS.DESCANSO)).toBe("normal");
  });

  it("activa reducir movimiento en el documento", async () => {
    const user = userEvent.setup();
    renderPagina();

    const interruptor = screen.getByRole("switch", {
      name: /reducir movimiento/i,
    });
    expect(interruptor).toHaveAttribute("aria-checked", "false");

    await user.click(interruptor);

    expect(interruptor).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.movimiento).toBe("reducido");
    expect(safeStorage.getItem(PREFERENCIAS_KEYS.MOVIMIENTO)).toBe("reducido");
  });
});
