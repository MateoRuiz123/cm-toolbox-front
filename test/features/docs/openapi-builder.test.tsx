import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpenApiBuilderForm } from "../../../src/features/docs/admin/openapi-builder-form";
import { OpenApiLivePreview } from "../../../src/features/docs/admin/openapi-live-preview";
import { resetDraftIdsForTests } from "../../../src/features/docs/admin/openapi-draft";

describe("OpenApiBuilderForm", () => {
  it("añade endpoint y materializa path/method en el JSON", async () => {
    resetDraftIdsForTests();
    const onEditorChange = vi.fn();
    render(
      <OpenApiBuilderForm initialText="" onEditorChange={onEditorChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Añadir endpoint/i }));

    const pathInput = await screen.findByDisplayValue("/recurso");
    fireEvent.change(pathInput, { target: { value: "/clientes/guia" } });

    await waitFor(() => {
      const last = onEditorChange.mock.calls.at(-1)?.[0] as string;
      expect(last).toContain('"/clientes/guia"');
      expect(last).toContain('"post"');
    });
  });
});

describe("OpenApiLivePreview", () => {
  it("con JSON válido renderiza el título", async () => {
    const spec = JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Preview API", version: "1.0.0" },
      paths: {},
    });
    render(
      <OpenApiLivePreview mode="editor" file={null} editorText={spec} />,
    );
    await waitFor(() => {
      expect(screen.getByText("Preview API")).toBeInTheDocument();
    });
  });

  it("con JSON inválido muestra error", async () => {
    render(
      <OpenApiLivePreview mode="editor" file={null} editorText="{ nope" />,
    );
    await waitFor(() => {
      expect(screen.getByText(/JSON inválido/i)).toBeInTheDocument();
    });
  });
});
