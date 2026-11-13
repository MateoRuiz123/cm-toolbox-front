import { describe, expect, it } from "vitest";
import {
  openApiToMarkdown,
  openApiToPrintHtml,
} from "../../../src/features/docs/openapi-to-markdown";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Generación de guías",
    version: "2.1.0",
    description: "Alta de guías.",
  },
  servers: [{ url: "https://api-test.coordinadora.tech" }],
  paths: {
    "/clientes/guia": {
      post: {
        summary: "Generar una guía de envío",
        responses: {
          "200": { description: "Guía generada" },
        },
      },
    },
  },
};

describe("openApiToMarkdown", () => {
  it("genera markdown de integración con título, URL y endpoint", () => {
    const md = openApiToMarkdown(spec);
    expect(md).toContain("# Generación de guías");
    expect(md).toContain("https://api-test.coordinadora.tech");
    expect(md).toContain("### POST `/clientes/guia`");
    expect(md).toContain("## Endpoints");
  });
});

describe("openApiToPrintHtml", () => {
  it("genera HTML imprimible con estilo corporativo y sin scripts", () => {
    const html = openApiToPrintHtml(spec);
    expect(html).toContain("<h1>Generación de guías</h1>");
    expect(html).toContain("Descripción General");
    expect(html).toContain("URL Base");
    expect(html).toContain('class="method"');
    expect(html).toContain("#cf222e");
    expect(html).toContain("#1f3a5f");
    expect(html).toContain("POST");
    expect(html).toContain("/clientes/guia");
    expect(html).toContain("Versión de Documentación");
    expect(html).toContain("Respuesta Exitosa");
    expect(html).toContain("@page");
    expect(html).toContain("margin: 0");
    expect(html).toContain("padding: 18mm 16mm");
    expect(html).toContain('class="keep"');
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("content: none");
    expect(html).toMatch(/<title><\/title>/);
    expect(html).toContain("Índice de Endpoints");
    expect(html).not.toContain("<script");
  });
});
