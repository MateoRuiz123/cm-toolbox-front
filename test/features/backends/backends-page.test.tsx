import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { BackendsPage } from "../../../src/features/backends/backends-page";
import {
  alternarLogFavorito,
  idWorkload,
  leerLogsSesion,
} from "../../../src/features/logs/logs-sesion";
import { AccessContext } from "../../../src/shared/auth/access-context";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";

class FakeWebSocket {
  static readonly OPEN = 1;
  readyState = FakeWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  constructor() {
    globalThis.setTimeout(() => {
      this.onopen?.();
    }, 0);
  }

  send(payload: string) {
    this.sent.push(payload);
    const parsed = JSON.parse(payload) as { action?: string };
    if (parsed.action === "authenticate") {
      this.onmessage?.({ data: JSON.stringify({ type: "authenticated" }) });
    } else if (parsed.action === "start") {
      this.onmessage?.({
        data: JSON.stringify({
          type: "log",
          pod: "cm-api-guias-pod-1",
          text: "2026-11-16T20:00:00Z INFO Peticion procesada 200",
        }),
      });
    }
  }

  close() {
    this.onclose?.();
  }
}

const renderBackends = () => {
  const profile = buildFallbackAccessProfile("operador@coordinadora.com");
  return render(
    <AccessContext.Provider
      value={{
        profile,
        roleId: profile.roleId,
        isSuperAdmin: true,
        canManageApps: true,
        canManageUsers: true,
        apps: profile.apps,
        loadingAccess: false,
        isUserBlocked: false,
        blockedMessage: null,
        devImpersonatedEmail: null,
        canAccessApp: () => true,
        canPerformAction: () => true,
        refreshAccess: async () => undefined,
        switchDevUser: async () => undefined,
      }}
    >
      <ThemeProvider>
        <MemoryRouter initialEntries={["/backends"]}>
          <Routes>
            <Route path="/backends" element={<BackendsPage />} />
            <Route path="/logs" element={<div>Destino Visor Logs</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </AccessContext.Provider>,
  );
};

describe("BackendsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("permite añadir backend, muestra métricas Test vs Prod lado a lado, abre drawer de logs y salta a /logs", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("WebSocket", FakeWebSocket);

    const savedBackends: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/me/backends") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/me/backends/") && init?.method === "PUT") {
        const parsed = JSON.parse(String(init.body)) as Record<string, unknown>;
        const record = { id: "cm-api-guias", ...parsed };
        savedBackends.push(record);
        return new Response(JSON.stringify({ data: record }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/workload-telemetry")) {
        const isProd = url.includes("env=prod");
        return new Response(
          JSON.stringify({
            env: isProd ? "prod" : "test",
            cluster: isProd ? "cm-cluster" : "cm-cluster-test",
            namespace: "apps",
            workload: "cm-api-guias",
            status: isProd ? "healthy" : "degraded",
            desiredReplicas: isProd ? 4 : 2,
            readyReplicas: isProd ? 4 : 1,
            totalRestarts: isProd ? 0 : 3,
            deployedAt: new Date(Date.now() - 3600_000).toISOString(),
            totalCpuMillicores: isProd ? 180 : 45,
            totalMemoryMiB: isProd ? 512 : 128,
            pods: [],
            traffic: {
              windowMinutes: 5,
              sampledPod: "cm-api-guias-1",
              totalRequests: isProd ? 62 : 15,
              rpm: isProd ? 12.4 : 3,
              count2xx: isProd ? 60 : 14,
              count4xx: 1,
              count5xx: isProd ? 1 : 0,
              rate4xxPercent: isProd ? 1.6 : 6.7,
              rate5xxPercent: isProd ? 1.6 : 0,
            },
            checkedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBackends();

    expect(
      await screen.findByText(/aún no tienes backends registrados/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /\+ añadir backend/i }),
    );

    await user.type(
      screen.getByLabelText(/nombre del servicio/i),
      "CM API Guías",
    );
    await user.type(screen.getByLabelText("Namespace Test"), "apps");
    await user.type(screen.getByLabelText("Workload Test"), "cm-api-guias");
    await user.type(screen.getByLabelText("Namespace Prod"), "apps");
    await user.type(screen.getByLabelText("Workload Prod"), "cm-api-guias");

    await user.click(
      screen.getByRole("button", { name: /guardar backend/i }),
    );

    await waitFor(() => {
      expect(savedBackends).toHaveLength(1);
    });

    expect(await screen.findByText("4/4 Ready")).toBeInTheDocument();
    expect(screen.getByText("1/2 Ready")).toBeInTheDocument();
    expect(screen.getByText("180m / 512Mi")).toBeInTheDocument();
    expect(screen.getByText("45m / 128Mi")).toBeInTheDocument();
    expect(screen.getByText("12.4 req/m")).toBeInTheDocument();

    const gkeTestLink = screen.getByRole("link", {
      name: /workload gke \(test\) para cm api guías/i,
    });
    expect(gkeTestLink).toHaveAttribute(
      "href",
      expect.stringContaining("https://console.cloud.google.com/kubernetes/deployment/"),
    );
    const logsProdLink = screen.getByRole("link", {
      name: /logs gcp \(prod\) para cm api guías/i,
    });
    expect(logsProdLink).toHaveAttribute(
      "href",
      expect.stringContaining("https://console.cloud.google.com/logs/query"),
    );

    const quickLogsButtons = screen.getAllByRole("button", {
      name: /vista rápida de logs/i,
    });
    await user.click(quickLogsButtons[0]);

    expect(
      await screen.findByText(/Peticion procesada 200/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /abrir completo en \/logs/i }),
    );

    expect(await screen.findByText("Destino Visor Logs")).toBeInTheDocument();
    expect(leerLogsSesion()).toEqual({
      env: "test",
      namespace: "cm-cluster-test|apps",
      workload: "cm-cluster-test|apps|cm-api-guias",
    });
  });

  it("muestra esqueleto de carga mientras llega la telemetría y lo reemplaza por datos", async () => {
    let releaseTelemetry: (() => void) | undefined;
    const telemetryGate = new Promise<void>((resolve) => {
      releaseTelemetry = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/me/backends")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "cm-docs-ms",
                name: "cm-docs-ms",
                description: "",
                tags: [],
                testTarget: {
                  cluster: "cm-cluster-test",
                  namespace: "apps",
                  workload: "cm-docs-ms",
                },
                prodTarget: null,
                displayOrder: 10,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/workload-telemetry")) {
        await telemetryGate;
        return new Response(
          JSON.stringify({
            env: "test",
            cluster: "cm-cluster-test",
            namespace: "apps",
            workload: "cm-docs-ms",
            status: "healthy",
            desiredReplicas: 1,
            readyReplicas: 1,
            totalRestarts: 0,
            deployedAt: new Date().toISOString(),
            totalCpuMillicores: 10,
            totalMemoryMiB: 64,
            pods: [],
            traffic: {
              windowMinutes: 5,
              sampledPod: null,
              totalRequests: 0,
              rpm: 0,
              count2xx: 0,
              count4xx: 0,
              count5xx: 0,
              rate4xxPercent: 0,
              rate5xxPercent: 0,
            },
            checkedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = renderBackends();

    await screen.findByRole("heading", { name: "cm-docs-ms" });
    await waitFor(() => {
      expect(
        container.querySelectorAll(".skeleton-shimmer").length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByText("1/1 Ready")).not.toBeInTheDocument();

    releaseTelemetry?.();

    expect(await screen.findByText("1/1 Ready")).toBeInTheDocument();
    expect(container.querySelectorAll(".skeleton-shimmer")).toHaveLength(0);
  });

  it("importa favoritos de Logs GKE y agrupa Test y Prod en una misma tarjeta", async () => {
    const user = userEvent.setup();
    alternarLogFavorito(
      {
        env: "test",
        namespace: "cm-cluster-test|apps",
        workload: idWorkload("cm-cluster-test", "apps", "cm-docs-ms"),
        cluster: "cm-cluster-test",
        namespaceName: "apps",
        workloadName: "cm-docs-ms",
      },
      "operador@coordinadora.com",
    );
    alternarLogFavorito(
      {
        env: "prod",
        namespace: "cm-cluster|apps",
        workload: idWorkload("cm-cluster", "apps", "cm-docs-ms"),
        cluster: "cm-cluster",
        namespaceName: "apps",
        workloadName: "cm-docs-ms",
      },
      "operador@coordinadora.com",
    );

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/me/backends") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/me/backends/") && init?.method === "PUT") {
        const parsed = JSON.parse(String(init.body)) as Record<string, unknown>;
        return new Response(
          JSON.stringify({ data: { id: "cm-docs-ms", ...parsed } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          env: "test",
          cluster: "cm-cluster-test",
          namespace: "apps",
          workload: "cm-docs-ms",
          status: "healthy",
          desiredReplicas: 1,
          readyReplicas: 1,
          totalRestarts: 0,
          deployedAt: new Date().toISOString(),
          totalCpuMillicores: 20,
          totalMemoryMiB: 90,
          pods: [],
          traffic: {
            windowMinutes: 5,
            sampledPod: "cm-docs-ms-1",
            totalRequests: 5,
            rpm: 1,
            count2xx: 5,
            count4xx: 0,
            count5xx: 0,
            rate4xxPercent: 0,
            rate5xxPercent: 0,
          },
          checkedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBackends();

    const importBtns = await screen.findAllByRole("button", {
      name: /importar favoritos de logs/i,
    });
    await user.click(importBtns[0]);

    expect(
      await screen.findByRole("heading", { name: "cm-docs-ms" }),
    ).toBeInTheDocument();
  });

  it("muestra botón para iniciar sesión GKE en AddBackendModal cuando gcloud expiró", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("WebSocket", FakeWebSocket);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/me/backends")) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/logs-api/api/auth")) {
        return new Response(
          JSON.stringify({
            error: "Sesión de gcloud expirada.",
            code: "GCLOUD_AUTH_REQUIRED",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBackends();

    await user.click(
      await screen.findByRole("button", { name: /\+ añadir backend/i }),
    );
    await user.type(
      screen.getByLabelText(/buscar workload en gke/i),
      "service-api-guias",
    );
    await user.click(
      screen.getByRole("button", { name: /buscar en gke/i }),
    );

    expect(
      await screen.findByText(/sesión de google cloud \(gcloud\) expiró/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /iniciar sesión en gke/i }),
    ).toBeInTheDocument();
  });

  it("despliega lista autocompletable en vivo al escribir y rellena Test y Prod al seleccionar", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/me/backends")) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/logs-api/api/auth")) {
        return new Response(JSON.stringify({ ok: true, label: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/logs-api/api/workloads")) {
        const isProd = url.includes("env=prod");
        return new Response(
          JSON.stringify([
            {
              cluster: isProd ? "cm-cluster-prod-ap-apis-02" : "cm-cluster-test-apis-01",
              location: "us-central1",
              namespace: "guias",
              name: "service-api-guias",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBackends();

    await user.click(
      await screen.findByRole("button", { name: /\+ añadir backend/i }),
    );

    const searchInput = screen.getByLabelText(/buscar workload en gke/i);
    await user.type(searchInput, "service-api");

    const listbox = await screen.findByRole("listbox", {
      name: /coincidencias de workloads/i,
    });
    expect(listbox).toHaveTextContent("service-api-guias");

    await user.click(
      screen.getByRole("button", { name: /service-api-guias/i }),
    );

    expect(
      (screen.getByLabelText(/nombre del servicio/i) as HTMLInputElement).value,
    ).toBe("service-api-guias");
    expect(
      (screen.getByLabelText("Workload Test") as HTMLInputElement).value,
    ).toBe("service-api-guias");
    expect(
      (screen.getByLabelText("Workload Prod") as HTMLInputElement).value,
    ).toBe("service-api-guias");
    expect(
      (screen.getByLabelText("Namespace Test") as HTMLInputElement).value,
    ).toBe("guias");
  });

  it("muestra guía para primera visita, paridad de versión, diagnóstico de fallo, logs/m, pods desplegables y filtros por estado", async () => {
    const user = userEvent.setup();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/me/backends")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "cm-aliados-consulta-ms",
                name: "cm-aliados-consulta-ms",
                description: "Consultas aliados",
                tags: ["Aliados"],
                testTarget: {
                  cluster: "cm-cluster-test-apis-01",
                  namespace: "aliados",
                  workload: "cm-aliados-consulta-ms",
                },
                prodTarget: {
                  cluster: "cm-cluster-prod-ap-apis-02",
                  namespace: "aliados",
                  workload: "cm-aliados-consulta-ms",
                },
                displayOrder: 10,
              },
              {
                id: "service-api-guias",
                name: "service-api-guias",
                description: "Cotización y emisión de guías",
                tags: ["Guías"],
                testTarget: {
                  cluster: "cluster-coordinadora-test-02",
                  namespace: "apis",
                  workload: "service-api-guias",
                },
                prodTarget: {
                  cluster: "cluster-coordinadora-prod",
                  namespace: "apis",
                  workload: "service-api-guias",
                },
                displayOrder: 20,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/workload-telemetry")) {
        const isProd = url.includes("env=prod");
        if (url.includes("cm-aliados-consulta-ms")) {
          return new Response(
            JSON.stringify({
              env: isProd ? "prod" : "test",
              cluster: isProd
                ? "cm-cluster-prod-ap-apis-02"
                : "cm-cluster-test-apis-01",
              namespace: "aliados",
              workload: "cm-aliados-consulta-ms",
              status: isProd ? "healthy" : "degraded",
              desiredReplicas: isProd ? 3 : 1,
              readyReplicas: isProd ? 3 : 0,
              totalRestarts: isProd ? 0 : 2,
              deployedAt: new Date(Date.now() - 120_000).toISOString(),
              imageTag: isProd ? "184229" : "181011",
              cpuLimitMillicores: isProd ? 1500 : 500,
              memoryLimitMiB: isProd ? 2304 : 768,
              issueSummary: isProd ? null : "ImagePullBackOff",
              totalCpuMillicores: isProd ? 450 : 25,
              totalMemoryMiB: isProd ? 1152 : 120,
              pods: [
                {
                  name: isProd
                    ? "cm-aliados-consulta-ms-prod-a"
                    : "cm-aliados-consulta-ms-test-a",
                  phase: isProd ? "Running" : "Pending",
                  ready: isProd,
                  restarts: isProd ? 0 : 2,
                  cpuMillicores: isProd ? 150 : 25,
                  memoryMiB: isProd ? 384 : 120,
                  startedAt: new Date().toISOString(),
                  issueReason: isProd ? null : "ImagePullBackOff",
                  issueMessage: isProd ? null : "ErrImagePull on image :181011",
                },
              ],
              traffic: {
                windowMinutes: 5,
                sampledPod: "cm-aliados-consulta-ms-prod-a",
                totalRequests: 0,
                rpm: 0,
                count2xx: 0,
                count4xx: 0,
                count5xx: 0,
                rate4xxPercent: 0,
                rate5xxPercent: 0,
                logLinesCount: isProd ? 30 : 0,
                logsPerMinute: isProd ? 6 : 0,
                errorLinesCount: 0,
              },
              checkedAt: new Date().toISOString(),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            env: isProd ? "prod" : "test",
            cluster: isProd
              ? "cluster-coordinadora-prod"
              : "cluster-coordinadora-test-02",
            namespace: "apis",
            workload: "service-api-guias",
            status: isProd ? "healthy" : "offline",
            desiredReplicas: isProd ? 8 : 0,
            readyReplicas: isProd ? 8 : 0,
            totalRestarts: 0,
            deployedAt: new Date().toISOString(),
            imageTag: isProd ? "v4.2" : null,
            issueSummary: isProd ? null : "Escalado a 0 réplicas (0/0)",
            totalCpuMillicores: isProd ? 900 : null,
            totalMemoryMiB: isProd ? 2048 : null,
            pods: [],
            traffic: {
              windowMinutes: 5,
              sampledPod: isProd ? "service-api-guias-1" : null,
              totalRequests: 0,
              rpm: 0,
              count2xx: 0,
              count4xx: 0,
              count5xx: 0,
              rate4xxPercent: 0,
              rate5xxPercent: 0,
              logLinesCount: isProd ? 45 : 0,
              logsPerMinute: isProd ? 9 : 0,
              errorLinesCount: 0,
            },
            checkedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderBackends();

    expect(
      await screen.findByText(/¿cómo leer este tablero\?/i),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(/Diferente versión: Test :181011 ≠ Prod :184229/),
    ).toBeInTheDocument();
    expect(screen.getByText("ImagePullBackOff")).toBeInTheDocument();
    expect(screen.getByText("6 logs/m")).toBeInTheDocument();
    expect(screen.getByText("9 logs/m")).toBeInTheDocument();
    expect(screen.getByText("Escalado 0/0")).toBeInTheDocument();

    const expandPodsBtns = screen.getAllByRole("button", {
      name: /ver pods \(1\)/i,
    });
    await user.click(expandPodsBtns[0]);
    expect(
      screen.getByText("cm-aliados-consulta-ms-test-a"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /con alerta/i }));
    expect(
      screen.getByRole("heading", { name: "cm-aliados-consulta-ms" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "service-api-guias" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^todos/i }));
    expect(
      screen.getByRole("heading", { name: "service-api-guias" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /entendido, ocultar guía/i }),
    );
    expect(
      screen.queryByText(/¿cómo leer este tablero\?/i),
    ).not.toBeInTheDocument();
  });
});
