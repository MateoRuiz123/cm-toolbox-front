import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LogsViewer } from "../../../src/features/logs/logs-viewer";
import type { LogStreamMessage } from "../../../src/features/logs/api/logs-types";

const logs: LogStreamMessage[] = [
  {
    id: "1",
    timestamp: 1_700_000_000_000,
    type: "log",
    text: "guia 20018012531 procesada",
    pod: "api-a",
  },
  {
    id: "2",
    timestamp: 1_700_000_000_000,
    type: "error",
    text: "fallo de conexion",
    pod: "worker-b",
  },
];

describe("LogsViewer", () => {
  it("filtra las líneas por texto o pod", async () => {
    const user = userEvent.setup();
    render(
      <LogsViewer logs={logs} isStreaming={false} onClear={() => undefined} />,
    );

    expect(screen.getByText("guia 20018012531 procesada")).toBeInTheDocument();
    expect(screen.getByText("fallo de conexion")).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: /buscar en los logs/i }),
      "worker-b",
    );

    expect(
      screen.queryByText("guia 20018012531 procesada"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("fallo de conexion")).toBeInTheDocument();
  });

  it("muestra enlaces a GKE y Cloud Logging en nueva pestaña cuando hay target", () => {
    render(
      <LogsViewer
        logs={logs}
        isStreaming={true}
        onClear={() => undefined}
        target={{
          workload: "service-api-guias",
          namespace: "apis",
          cluster: "cluster-coordinadora-prod",
          env: "prod",
          location: "us-central1",
          project: "cm-cluster-coordinadora-prod",
        }}
      />,
    );

    const gkeLink = screen.getByRole("link", { name: /workload gke/i });
    expect(gkeLink).toHaveAttribute("target", "_blank");
    expect(gkeLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(gkeLink).toHaveAttribute(
      "href",
      "https://console.cloud.google.com/kubernetes/deployment/us-central1/cluster-coordinadora-prod/apis/service-api-guias/overview?project=cm-cluster-coordinadora-prod",
    );

    const logsLink = screen.getByRole("link", { name: /logs gcp/i });
    expect(logsLink).toHaveAttribute("target", "_blank");
    expect(logsLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(logsLink.getAttribute("href")).toContain(
      "https://console.cloud.google.com/logs/query;query=",
    );
    expect(logsLink.getAttribute("href")).toContain(
      "project=cm-cluster-coordinadora-prod",
    );
  });

  it("ejecuta onReload al pulsar el botón Recargar", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();

    render(
      <LogsViewer
        logs={logs}
        isStreaming={true}
        onClear={() => undefined}
        onReload={onReload}
        target={{
          workload: "service-api-guias",
          namespace: "apis",
          cluster: "cluster-coordinadora-prod",
          env: "prod",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /recargar/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
