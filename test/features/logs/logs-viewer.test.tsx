import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
});
