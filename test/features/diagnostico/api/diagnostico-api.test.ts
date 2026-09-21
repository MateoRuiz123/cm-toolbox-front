import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  diagnosticarMigracion,
  reintentarMigracionGuia,
} from "../../../../src/features/diagnostico/api/diagnostico-api";
import {
  diagnosticoEnvelopeFixture,
  diagnosticoErrorFixture,
} from "../../../fixtures/diagnostico";

describe("reintentarMigracionGuia", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv(
      "VITE_DIAGNOSTICO_URL",
      "http://localhost:8080/cm-api-internos/migracion/diagnostico",
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("envía el payload emulado de Pub/Sub con base64 y retorna éxito cuando el API responde 200", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> = {};

    globalThis.fetch = vi
      .fn()
      .mockImplementation(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedBody = JSON.parse(init?.body as string) as Record<
          string,
          unknown
        >;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            state: true,
            message: "Guía encolada para migración",
          }),
        } as unknown as Response;
      });

    const resultado = await reintentarMigracionGuia("30930009346");

    expect(capturedUrl).toBe(
      "http://localhost:8080/cm-api-internos/migracion/guia",
    );
    expect(resultado.success).toBe(true);
    expect(resultado.codigo_remision).toBe("30930009346");

    const message = capturedBody.message as {
      data: string;
      subscription?: string;
    };
    expect(message).toBeDefined();
    const decodedData = JSON.parse(atob(message.data)) as {
      codigo_remision: string;
    };
    expect(decodedData.codigo_remision).toBe("30930009346");
    expect(capturedBody.subscription).toBe(
      "projects/cm-api-guias-test/subscriptions/fletes-plenos-sub",
    );
  });

  it("usa VITE_PUBSUB_SUBSCRIPTION cuando está definida", async () => {
    vi.stubEnv(
      "VITE_PUBSUB_SUBSCRIPTION",
      "projects/cm-api-guias/subscriptions/migracion-guia-sub",
    );
    let capturedBody: Record<string, unknown> = {};

    globalThis.fetch = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string) as Record<
          string,
          unknown
        >;
        return {
          ok: true,
          status: 200,
          json: async () => ({ state: true, message: "ok" }),
        } as unknown as Response;
      });

    await reintentarMigracionGuia("30930009346");
    expect(capturedBody.subscription).toBe(
      "projects/cm-api-guias/subscriptions/migracion-guia-sub",
    );
  });

  it("maneja respuestas de error del backend (HTTP 500)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Error interno en BD" }),
    } as unknown as Response);

    const resultado = await reintentarMigracionGuia("99999999");
    expect(resultado.success).toBe(false);
    expect(resultado.message).toContain("Error interno en BD");
  });

  it("permite cancelar el diagnóstico usando AbortSignal", async () => {
    const controller = new AbortController();
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new DOMException(
              "The operation was aborted.",
              "AbortError",
            );
            reject(abortError);
          });
        });
      });

    const promesa = diagnosticarMigracion(
      { codigos_remision: ["12345"], codigos_despacho: [] },
      controller.signal,
    );

    controller.abort();

    await expect(promesa).rejects.toThrow("Consulta cancelada por el usuario.");
  });
});

describe("diagnosticarMigracion", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv(
      "VITE_DIAGNOSTICO_URL",
      "http://localhost:8080/cm-api-internos/migracion/diagnostico",
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("envía el contrato de consulta y devuelve data del envelope", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = vi
      .fn()
      .mockImplementation(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedInit = init;
        return {
          ok: true,
          status: 200,
          json: async () => diagnosticoEnvelopeFixture,
        } as unknown as Response;
      });

    const result = await diagnosticarMigracion({
      codigos_remision: ["20018012531"],
      codigos_despacho: [56727471],
    });

    expect(capturedUrl).toBe(
      "http://localhost:8080/cm-api-internos/migracion/diagnostico",
    );
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      codigos_remision: ["20018012531"],
      codigos_despacho: [56727471],
    });
    expect(result).toEqual(diagnosticoEnvelopeFixture.data);
  });

  it("reporta una configuración faltante antes de llamar al backend", async () => {
    vi.stubEnv("VITE_DIAGNOSTICO_URL", "");

    await expect(
      diagnosticarMigracion({ codigos_remision: ["20018012531"], codigos_despacho: [] }),
    ).rejects.toThrow("Falta configurar VITE_DIAGNOSTICO_URL.");
    expect(globalThis.fetch).toBe(originalFetch);
  });

  it("propaga el mensaje del API cuando devuelve error HTTP", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => diagnosticoErrorFixture,
    } as unknown as Response);

    await expect(
      diagnosticarMigracion({ codigos_remision: ["20018012531"], codigos_despacho: [] }),
    ).rejects.toThrow("Error interno en BD");
  });

  it("rechaza una respuesta exitosa sin data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: "sin datos" }),
    } as unknown as Response);

    await expect(
      diagnosticarMigracion({ codigos_remision: ["20018012531"], codigos_despacho: [] }),
    ).rejects.toThrow("El API respondió sin datos de diagnóstico.");
  });

  it("normaliza JSON inválido como error de conexión", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Response);

    await expect(
      diagnosticarMigracion({ codigos_remision: ["20018012531"], codigos_despacho: [] }),
    ).rejects.toThrow("No fue posible conectar con el servicio de diagnóstico.");
  });

  it("convierte el timeout interno en un mensaje accionable", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockImplementation((_url, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
    );

    const request = diagnosticarMigracion({
      codigos_remision: ["20018012531"],
      codigos_despacho: [],
    });
    const expectation = expect(request).rejects.toThrow(
      "La consulta tardó más de 120 segundos. Intenta con menos códigos.",
    );
    await vi.advanceTimersByTimeAsync(120_000);

    await expectation;
  });
});
