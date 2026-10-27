import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OpenApiViewer } from "../../../src/features/docs/openapi-viewer";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Generación de guías",
    version: "2.1.0",
    description: "Alta de guías.",
  },
  servers: [{ url: "https://api-test.coordinadora.tech" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/oauth/token": {
      post: {
        summary: "Obtener token de acceso",
        security: [{ basicAuth: [] }],
        requestBody: {
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["grant_type"],
                properties: {
                  grant_type: {
                    type: "string",
                    description: "Tipo de flujo OAuth 2.0",
                  },
                },
              },
              example: { grant_type: "client_credentials" },
            },
          },
        },
        responses: {
          "200": { description: "Token emitido" },
        },
      },
    },
    "/clientes/guia": {
      post: {
        summary: "Generar una guía de envío",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["valoracion"],
                properties: {
                  valoracion: {
                    type: "string",
                    description: "Valor declarado del envío",
                  },
                },
              },
              example: { valoracion: "1000.00" },
            },
          },
        },
        responses: {
          "200": { description: "Guía generada" },
          "400": {
            description: "El body no cumple el schema",
            content: {
              "application/json": {
                example: { cause: "El campo valoracion es requerido" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      basicAuth: { type: "http", scheme: "basic" },
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
};

describe("OpenApiViewer", () => {
  it("muestra URL base, cURL de token, campo obligatorio y error", async () => {
    const user = userEvent.setup();
    render(<OpenApiViewer document={spec} />);

    expect(
      screen.getByRole("heading", { name: "Generación de guías" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("https://api-test.coordinadora.tech"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/grant_type=client_credentials/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("valoracion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sí").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/El campo valoracion es requerido/),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Token de acceso"), "eyJ-prueba");
    expect(screen.getByText(/Bearer eyJ-prueba/)).toBeInTheDocument();
  });
});
