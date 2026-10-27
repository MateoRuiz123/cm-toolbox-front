import { describe, expect, it, beforeEach } from "vitest";
import {
  createEmptyDraft,
  createEmptyOperation,
  draftToOpenApi,
  openApiToDraft,
  parseOpenApiJsonText,
  resetDraftIdsForTests,
  type OpenApiDraft,
} from "../../../src/features/docs/admin/openapi-draft";

describe("openapi-draft", () => {
  beforeEach(() => {
    resetDraftIdsForTests();
  });

  it("round-trip mínimo: endpoint + body + 200", () => {
    const draft: OpenApiDraft = {
      ...createEmptyDraft(),
      title: "API Demo",
      version: "1.2.0",
      description: "Demo",
      serverUrl: "https://api-test.example.com",
      bearerAuth: true,
      operations: [
        {
          ...createEmptyOperation(),
          method: "post",
          path: "/clientes/guia",
          summary: "Crear guía",
          bodyFields: [
            {
              id: "f1",
              name: "valoracion",
              type: "string",
              required: true,
              description: "Valor declarado",
              example: "1000.00",
            },
          ],
          success: {
            id: "s1",
            status: "200",
            description: "OK",
            exampleJson: '{ "ok": true }',
          },
          errors: [],
        },
      ],
    };

    const openapi = draftToOpenApi(draft);
    expect(openapi.openapi).toBe("3.0.3");
    expect((openapi.info as { title: string }).title).toBe("API Demo");
    expect(
      (openapi.paths as Record<string, Record<string, unknown>>)[
        "/clientes/guia"
      ].post,
    ).toBeTruthy();

    const back = openApiToDraft(openapi);
    expect(back.title).toBe("API Demo");
    expect(back.version).toBe("1.2.0");
    expect(back.serverUrl).toBe("https://api-test.example.com");
    expect(back.bearerAuth).toBe(true);
    expect(back.operations).toHaveLength(1);
    expect(back.operations[0]?.method).toBe("post");
    expect(back.operations[0]?.path).toBe("/clientes/guia");
    expect(back.operations[0]?.bodyFields[0]?.name).toBe("valoracion");
    expect(back.operations[0]?.success.status).toBe("200");
  });

  it("parseOpenApiJsonText distingue vacío, YAML y JSON inválido", () => {
    expect(parseOpenApiJsonText("").ok).toBe(false);
    expect(parseOpenApiJsonText("openapi: 3.0.3").ok).toBe(false);
    expect(parseOpenApiJsonText("{").ok).toBe(false);
    const ok = parseOpenApiJsonText(
      '{"openapi":"3.0.3","info":{"title":"X","version":"1"},"paths":{}}',
    );
    expect(ok.ok).toBe(true);
  });
});
