import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DocsApiError,
  fetchDocsCatalog,
  fetchOpenApi,
} from "../../../../src/features/docs/api/docs-api";
import { setDocsAuthTokenProvider } from "../../../../src/features/docs/api/token-provider";

describe("docs-api", () => {
  beforeEach(() => {
    setDocsAuthTokenProvider(() => "test-token");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lista catálogo con Bearer", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "api-demo",
              name: "Demo",
              version: "1.0.0",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const data = await fetchDocsCatalog();
    expect(data).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/docs-api/v1/apis");
    expect(
      (vi.mocked(fetch).mock.calls[0]?.[1]?.headers as Record<string, string>)
        .Authorization,
    ).toBe("Bearer test-token");
  });

  it("propaga 404 genérico", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "No se encontró la documentación solicitada.",
        }),
        {
          status: 404,
        },
      ),
    );
    await expect(fetchOpenApi("api-x")).rejects.toBeInstanceOf(DocsApiError);
  });
});
