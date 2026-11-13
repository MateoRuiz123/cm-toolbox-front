import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { LogsPage } from "../../../src/features/logs/logs-page";
import { LogsApiError } from "../../../src/features/logs/api/logs-api";
import {
  agruparAccesosPorWorkload,
  registrarLogReciente,
} from "../../../src/features/logs/logs-sesion";

vi.mock("../../../src/features/logs/api/logs-api", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../src/features/logs/api/logs-api")
    >();
  return {
    ...actual,
    authCluster: vi.fn(),
    fetchNamespaces: vi.fn(),
    fetchWorkloads: vi.fn(),
    createLogsWebSocket: vi.fn(),
  };
});

describe("LogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.removeItem("logs_seleccion");
    localStorage.clear();
  });

  it("renderiza el heading accesible del visor de logs", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/logs"]}>
        <LogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Visor de Logs en Tiempo Real");
    expect(html).toContain("Panel de consulta");
    expect(html).toContain("Listo para monitorear");
  });

  it("inicia con formulario deshabilitado parcialmente sin ambiente", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/logs"]}>
        <LogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Parámetros de consulta");
    expect(html).toContain("disabled");
  });

  it("expone LogsApiError con código GCLOUD_AUTH_REQUIRED", () => {
    const err = new LogsApiError("credenciales", 401, "GCLOUD_AUTH_REQUIRED");
    expect(err.status).toBe(401);
    expect(err.code).toBe("GCLOUD_AUTH_REQUIRED");
  });

  it("agrupa una misma carga de trabajo en prod y test sin repetirla en recientes ni favoritos", () => {
    registrarLogReciente(
      {
        env: "test",
        namespace: "cluster-test|apis",
        workload: "cluster-test|apis|service-api-guias",
        cluster: "cluster-test",
        namespaceName: "apis",
        workloadName: "service-api-guias",
      },
      "dev@coordinadora.com",
    );
    const recientes = registrarLogReciente(
      {
        env: "prod",
        namespace: "cluster-prod|apis",
        workload: "cluster-prod|apis|service-api-guias",
        cluster: "cluster-prod",
        namespaceName: "apis",
        workloadName: "service-api-guias",
      },
      "dev@coordinadora.com",
    );

    const agrupados = agruparAccesosPorWorkload(recientes);
    expect(agrupados).toHaveLength(1);
    expect(agrupados[0]?.workloadName).toBe("service-api-guias");
    expect(agrupados[0]?.prod?.cluster).toBe("cluster-prod");
    expect(agrupados[0]?.test?.cluster).toBe("cluster-test");
  });
});
