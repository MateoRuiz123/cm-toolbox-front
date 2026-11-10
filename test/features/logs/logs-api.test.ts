import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authenticateLogsWebSocket,
  createLogsWebSocket,
  fetchNamespaces,
  fetchWorkloads,
  parseLogStreamMessage,
} from "../../../src/features/logs/api/logs-api";
import { guardarToken, limpiarToken } from "../../../src/shared/auth/token";

describe("logs-api", () => {
  afterEach(() => {
    limpiarToken();
    vi.unstubAllGlobals();
  });

  it("envía el bearer token en las solicitudes HTTP", async () => {
    guardarToken("corporate-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchNamespaces("test");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const callHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(callHeaders.get("Authorization")).toBe("Bearer corporate-token");
  });

  it("usa rutas same-origin sin exponer la URL del backend", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWorkloads("test", "cluster-a|ns-a", " api ");

    expect(fetchMock).toHaveBeenCalledWith(
      "/logs-api/api/workloads?env=test&cluster=cluster-a&namespace=ns-a&q=api",
      expect.any(Object),
    );
  });

  it("abre el WebSocket contra el mismo origen bajo /logs-api", () => {
    const WebSocketMock = vi.fn();
    vi.stubGlobal("WebSocket", WebSocketMock);

    createLogsWebSocket();

    expect(WebSocketMock).toHaveBeenCalledWith(
      `ws://${globalThis.location.host}/logs-api/`,
    );
  });

  it("envía authenticate como primer mensaje del socket", () => {
    guardarToken("corporate-token");
    const send = vi.fn();

    authenticateLogsWebSocket({ send } as unknown as WebSocket);

    expect(send).toHaveBeenCalledWith(
      JSON.stringify({ action: "authenticate", token: "corporate-token" }),
    );
  });

  it("asigna identidad y timestamp estables al parsear un evento", () => {
    const message = parseLogStreamMessage(
      JSON.stringify({ type: "log", text: "hello" }),
    );

    expect(message?.id).toEqual(expect.any(String));
    expect(message?.timestamp).toEqual(expect.any(Number));
  });
});
