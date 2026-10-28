import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportPdfModal } from "../../../src/features/docs/export-pdf-modal";

const spec = {
  openapi: "3.0.3",
  info: { title: "API Demo", version: "1.0.0" },
  paths: {
    "/ping": {
      get: {
        summary: "Ping",
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

describe("ExportPdfModal", () => {
  it("muestra la vista previa y cierra con el botón", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExportPdfModal openApiDocument={spec} onClose={onClose} />);

    expect(
      screen.getByRole("dialog", { name: /exportar pdf/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByTitle("Vista previa de la documentación para PDF"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /imprimir \/ guardar pdf/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /cerrar vista previa/i }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("dispara print sobre el iframe", async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    const focus = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const frameDocument = { title: "API Demo" };

    render(<ExportPdfModal openApiDocument={spec} onClose={vi.fn()} />);
    const iframe = screen.getByTitle(
      "Vista previa de la documentación para PDF",
    ) as HTMLIFrameElement;

    Object.defineProperty(iframe, "contentWindow", {
      configurable: true,
      value: { print, focus, addEventListener, removeEventListener },
    });
    Object.defineProperty(iframe, "contentDocument", {
      configurable: true,
      value: frameDocument,
    });

    await user.click(
      screen.getByRole("button", { name: /imprimir \/ guardar pdf/i }),
    );
    expect(frameDocument.title).toBe("");
    expect(focus).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
    expect(addEventListener).toHaveBeenCalledWith(
      "afterprint",
      expect.any(Function),
    );
  });
});
