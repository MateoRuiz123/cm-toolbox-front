import { fireEvent, render, screen } from "@testing-library/react";
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

  it('clasifica {"isError":false,"status":200} como INF y no como ERR', () => {
    const jsonLog: LogStreamMessage[] = [
      {
        id: "10",
        timestamp: 1_700_000_000_000,
        type: "log",
        text: 'equipoCM {"isError":false,"status":200,"code":"S001"}',
        pod: "api-a",
      },
    ];

    render(
      <LogsViewer
        logs={jsonLog}
        isStreaming={false}
        onClear={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /INF/i })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /ERR/i })).toHaveTextContent("0");
  });

  it("permite expandir JSON formateado en una línea con el botón { } JSON", async () => {
    const user = userEvent.setup();
    const jsonLog: LogStreamMessage[] = [
      {
        id: "11",
        timestamp: 1_700_000_000_000,
        type: "log",
        text: 'respuesta {"isError":false,"status":200,"ok":true}',
        pod: "api-a",
      },
    ];

    render(
      <LogsViewer
        logs={jsonLog}
        isStreaming={false}
        onClear={() => undefined}
      />,
    );

    const jsonButton = screen.getByRole("button", { name: /\{ \} json/i });
    expect(jsonButton).toHaveAttribute("aria-expanded", "false");

    await user.click(jsonButton);

    expect(jsonButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"status": 200/)).toBeInTheDocument();
  });

  it("filtra por pod al hacer clic en su badge y permite limpiar el filtro", async () => {
    const user = userEvent.setup();
    render(
      <LogsViewer logs={logs} isStreaming={false} onClear={() => undefined} />,
    );

    await user.click(screen.getByRole("button", { name: "api-a" }));

    expect(screen.getByText("guia 20018012531 procesada")).toBeInTheDocument();
    expect(screen.queryByText("fallo de conexion")).not.toBeInTheDocument();

    const clearPodChip = screen.getByRole("button", {
      name: /pod: api-a/i,
    });
    await user.click(clearPodChip);

    expect(screen.getByText("fallo de conexion")).toBeInTheDocument();
  });

  it("muestra la hora real del registro cuando kubectl antepone timestamp RFC3339", () => {
    const rawIso = "2026-11-13T15:05:09.123456789Z";
    const expectedClock = new Date("2026-11-13T15:05:09.123Z").toLocaleTimeString(
      "es",
      { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },
    );
    const kubeLogs: LogStreamMessage[] = [
      {
        id: "20",
        timestamp: new Date("2026-11-13T16:24:30.000Z").getTime(),
        type: "log",
        text: `${rawIso} Guia generada 998877`,
        pod: "api-a",
      },
    ];

    render(
      <LogsViewer
        logs={kubeLogs}
        isStreaming={false}
        onClear={() => undefined}
      />,
    );

    expect(screen.getByText("Guia generada 998877")).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(rawIso))).not.toBeInTheDocument();
    const timeEl = screen.getByTitle(/UTC: 2026-11-13T15:05:09\.123456789Z/);
    expect(timeEl.textContent).toContain(expectedClock);
  });

  it("mantiene activo Auto-scroll cuando llegan ráfagas que aumentan scrollHeight sin desplazamiento hacia arriba", () => {
    const { container, rerender } = render(
      <LogsViewer logs={logs} isStreaming={true} onClear={() => undefined} />,
    );

    const scrollContainer = container.querySelector(
      ".overflow-y-auto",
    ) as HTMLDivElement;
    let scrollHeight = 500;
    Object.defineProperty(scrollContainer, "scrollHeight", {
      get: () => scrollHeight,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, "clientHeight", {
      value: 300,
      configurable: true,
    });

    rerender(
      <LogsViewer
        logs={[
          ...logs,
          {
            id: "3",
            timestamp: 1_700_000_001_000,
            type: "log",
            text: "rafaga inicial",
            pod: "api-a",
          },
        ]}
        isStreaming={true}
        onClear={() => undefined}
      />,
    );

    expect(scrollContainer.scrollTop).toBe(200);

    // Simula un crecimiento súbito de scrollHeight mayor a 48px antes de sincronizar
    scrollHeight = 900;
    fireEvent.scroll(scrollContainer);

    const autoScrollButton = screen.getByRole("button", {
      name: /auto-scroll/i,
    });
    expect(autoScrollButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("button", { name: /ir al final/i }),
    ).not.toBeInTheDocument();
  });

  it("desactiva Auto-scroll al hacer scroll hacia arriba y lo reactiva al volver al final", () => {
    const { container, rerender } = render(
      <LogsViewer logs={logs} isStreaming={true} onClear={() => undefined} />,
    );

    const scrollContainer = container.querySelector(
      ".overflow-y-auto",
    ) as HTMLDivElement;
    Object.defineProperty(scrollContainer, "scrollHeight", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, "clientHeight", {
      value: 300,
      configurable: true,
    });

    rerender(
      <LogsViewer
        logs={[
          ...logs,
          {
            id: "4",
            timestamp: 1_700_000_002_000,
            type: "log",
            text: "linea en vivo",
            pod: "api-a",
          },
        ]}
        isStreaming={true}
        onClear={() => undefined}
      />,
    );

    const autoScrollButton = screen.getByRole("button", {
      name: /auto-scroll/i,
    });
    expect(autoScrollButton).toHaveAttribute("aria-pressed", "true");
    expect(scrollContainer.scrollTop).toBe(700);

    scrollContainer.scrollTop = 200;
    fireEvent.scroll(scrollContainer);

    expect(autoScrollButton).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: /ir al final/i }),
    ).toBeInTheDocument();

    scrollContainer.scrollTop = 690;
    fireEvent.scroll(scrollContainer);

    expect(autoScrollButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("button", { name: /ir al final/i }),
    ).not.toBeInTheDocument();
  });
});
