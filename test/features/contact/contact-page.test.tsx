import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { ContactPage } from "../../../src/features/contact/contact-page";

const renderContactFlow = (path = "/contacto") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/contacto" element={<ContactPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ContactPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra resumen de errores cuando el formulario está vacío", async () => {
    const user = userEvent.setup();
    renderContactFlow();

    await user.click(
      screen.getByRole("button", { name: /abrir correo con el mensaje/i }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /hay un problema con el formulario/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("El nombre es requerido.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("El correo electrónico es requerido.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("El mensaje no puede estar vacío.").length,
    ).toBeGreaterThan(0);
  });

  it("abre mailto con el mensaje precargado tras un envío válido", async () => {
    const user = userEvent.setup();
    let assignedHref = "";
    vi.stubGlobal("location", {
      ...globalThis.location,
      set href(value: string) {
        assignedHref = value;
      },
      get href() {
        return assignedHref;
      },
    });

    renderContactFlow();

    await user.type(
      screen.getByLabelText(/nombre completo/i),
      "Ana Coordinadora",
    );
    await user.type(
      screen.getByLabelText(/correo corporativo/i),
      "ana@coordinadora.com",
    );
    await user.type(
      screen.getByLabelText(/mensaje o detalle del caso/i),
      "Detalle de prueba con más de diez caracteres.",
    );
    await user.click(
      screen.getByRole("button", { name: /abrir correo con el mensaje/i }),
    );

    expect(assignedHref).toMatch(/^mailto:soporte\.ti@coordinadora\.com\?/);
    expect(assignedHref).toContain(encodeURIComponent("[Toolbox]"));
    expect(assignedHref).toContain(encodeURIComponent("Ana Coordinadora"));
  });

  it("precarga query params y envía reporte automático al presionar el botón directo", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            ticketId: "INC-CONTACT-42",
            createdAt: new Date().toISOString(),
            status: "sent",
            notifiedWebhook: true,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderContactFlow("/contacto?app=diagnostico&estado=offline");

    const messageBox = screen.getByLabelText(/mensaje o detalle del caso/i);
    expect((messageBox as HTMLTextAreaElement).value).toContain(
      "Herramienta reportada: diagnostico",
    );
    expect((messageBox as HTMLTextAreaElement).value).toContain(
      "Estado detectado: offline",
    );

    await user.click(
      screen.getByRole("button", { name: /enviar reporte automático/i }),
    );

    expect(
      await screen.findByText(/INC-CONTACT-42/),
    ).toBeInTheDocument();
  });
});
