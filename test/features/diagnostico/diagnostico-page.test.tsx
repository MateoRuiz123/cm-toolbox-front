import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticoPage } from "../../../src/features/diagnostico/diagnostico-page";
import { DiagnosticoApiError } from "../../../src/features/diagnostico/api/diagnostico-api";
import { diagnosticoOutputFixture } from "../../fixtures/diagnostico";

vi.mock(
  "../../../src/features/diagnostico/api/diagnostico-api",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../src/features/diagnostico/api/diagnostico-api")
      >();
    return {
      ...actual,
      diagnosticarMigracion: vi.fn(),
    };
  },
);

const { diagnosticarMigracion } =
  await import("../../../src/features/diagnostico/api/diagnostico-api");

const remisionesInput = () => screen.getByPlaceholderText(/20018012531/);

describe("DiagnosticoPage", () => {
  beforeEach(() => {
    vi.mocked(diagnosticarMigracion).mockReset();
    sessionStorage.removeItem("diagnostico_consulta");
  });
  it("muestra el estado inicial antes de consultar", () => {
    render(<DiagnosticoPage />);

    expect(
      screen.getByRole("heading", { name: /diagnóstico de migración/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /listo para diagnosticar/i }),
    ).toBeInTheDocument();
  });

  it("valida que haya al menos un código antes de consultar", async () => {
    const user = userEvent.setup();
    render(<DiagnosticoPage />);

    await user.click(screen.getByRole("button", { name: /^diagnosticar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ingresa al menos una remisión o un despacho.",
    );
  });

  it("muestra el esqueleto mientras la consulta está en curso", async () => {
    vi.mocked(diagnosticarMigracion).mockImplementation(
      () => new Promise(() => undefined),
    );
    const user = userEvent.setup();
    render(<DiagnosticoPage />);

    await user.type(remisionesInput(), "20018012531");
    await user.click(screen.getByRole("button", { name: /^diagnosticar$/i }));

    expect(
      await screen.findByLabelText("Cargando resultados del diagnóstico"),
    ).toBeInTheDocument();
  });

  it("renderiza resultados cuando el API responde con éxito", async () => {
    vi.mocked(diagnosticarMigracion).mockResolvedValue(
      diagnosticoOutputFixture,
    );
    const user = userEvent.setup();
    render(<DiagnosticoPage />);

    await user.type(remisionesInput(), "20018012531");
    await user.click(screen.getByRole("button", { name: /^diagnosticar$/i }));

    expect(await screen.findByText("Resultado del Lote")).toBeInTheDocument();
  });

  it("enfoca remisiones al abrir y consulta con Ctrl+Enter", async () => {
    vi.mocked(diagnosticarMigracion).mockResolvedValue(
      diagnosticoOutputFixture,
    );
    const user = userEvent.setup();
    render(<DiagnosticoPage />);

    expect(screen.getByLabelText("Remisiones")).toHaveFocus();

    await user.type(remisionesInput(), "20018012531");
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(diagnosticarMigracion).toHaveBeenCalledWith(
      { codigos_remision: ["20018012531"], codigos_despacho: [] },
      expect.any(AbortSignal),
    );
    expect(await screen.findByText("Resultado del Lote")).toBeInTheDocument();
  });

  it("recupera la última consulta guardada en la pestaña", () => {
    sessionStorage.setItem(
      "diagnostico_consulta",
      JSON.stringify({ remisiones: "20018012531", despachos: "56727471" }),
    );

    render(<DiagnosticoPage />);

    expect(screen.getByLabelText("Remisiones")).toHaveValue("20018012531");
    expect(screen.getByLabelText("Despachos")).toHaveValue("56727471");
  });

  it("muestra el mensaje de error del API", async () => {
    vi.mocked(diagnosticarMigracion).mockRejectedValue(
      new DiagnosticoApiError("Error interno en BD"),
    );
    const user = userEvent.setup();
    render(<DiagnosticoPage />);

    await user.type(remisionesInput(), "20018012531");
    await user.click(screen.getByRole("button", { name: /^diagnosticar$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Error interno en BD",
      );
    });
  });
});
