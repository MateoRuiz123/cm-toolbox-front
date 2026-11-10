import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DocsApiError,
  fetchClienteProfile,
  fetchDocsCatalog,
  fetchOpenApi,
  updateClienteProfile,
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
    const callHeaders = vi.mocked(fetch).mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(callHeaders?.Authorization).toBe("Bearer test-token");
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

  it("GET y PATCH /me de perfil cliente", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "demo",
            name: "Cliente Demo",
            email: "a@b.com",
            status: "active",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const profile = await fetchClienteProfile();
    expect(profile.id).toBe("demo");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/docs-api/v1/me");

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "demo",
            name: "Nuevo",
            email: "n@b.com",
            status: "active",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const updated = await updateClienteProfile({
      name: "Nuevo",
      email: "n@b.com",
    });
    expect(updated.name).toBe("Nuevo");
    expect(vi.mocked(fetch).mock.calls[1]?.[1]?.method).toBe("PATCH");
  });
});
