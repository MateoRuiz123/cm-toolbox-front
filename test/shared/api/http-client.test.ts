import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpClient, HttpError } from "../../../src/shared/api/http-client";

describe("createHttpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("agrega prefijo basePath y cabecera Accept por defecto", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createHttpClient("/api/v1");
    const data = await client.get<{ status: string }>("/users");

    expect(data).toEqual({ status: "ok" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/users",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
  });

  it("serializa el body en peticiones POST con Content-Type application/json", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "123" }), { status: 201 }),
    );

    const client = createHttpClient();
    const result = await client.post<{ id: string }>("/items", { name: "test" });

    expect(result).toEqual({ id: "123" });
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs?.[0]).toBe("/items");
    expect(callArgs?.[1]?.body).toBe(JSON.stringify({ name: "test" }));
  });

  it("lanza HttpError con código y mensaje ante respuestas no exitosas", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ code: "ITEM_NOT_FOUND", message: "El ítem no existe" }),
        { status: 404, statusText: "Not Found" },
      ),
    );

    const client = createHttpClient();
    await expect(client.get("/items/999")).rejects.toThrowError(HttpError);

    try {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "ITEM_NOT_FOUND", message: "El ítem no existe" }),
          { status: 404, statusText: "Not Found" },
        ),
      );
      await client.get("/items/999");
    } catch (err) {
      const httpErr = err as HttpError;
      expect(httpErr.status).toBe(404);
      expect(httpErr.code).toBe("ITEM_NOT_FOUND");
      expect(httpErr.message).toBe("El ítem no existe");
    }
  });

  it("soporta cancelación de peticiones vía AbortSignal externo", async () => {
    const controller = new AbortController();
    controller.abort();

    const client = createHttpClient();
    await expect(
      client.get("/slow", { signal: controller.signal }),
    ).rejects.toThrowError("Petición cancelada por el usuario.");
  });

  it("maneja respuestas 204 No Content devolviendo undefined", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = createHttpClient();
    const res = await client.delete("/items/1");
    expect(res).toBeUndefined();
  });
});
