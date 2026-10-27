import { describe, expect, it } from "vitest";
import { openApiToMarkdown } from "../../../src/features/docs/openapi-to-markdown";

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
