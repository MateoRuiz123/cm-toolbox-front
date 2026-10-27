import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditLogsTab } from "../../../src/features/admin/audit-logs-tab";
import type { AuditLogItem } from "../../../src/features/admin/api/admin-api";

const sampleLog: AuditLogItem = {
  id: "log-1",
  actorEmail: "admin@coordinadora.com",
  eventType: "APP_ID_RENAMED",
  targetType: "app",
  targetId: "docs",
  beforeState: { id: "documentacion-cliente" },
  afterState: { id: "docs" },
  createdAt: "2026-10-23T12:00:00.000Z",
};

describe("AuditLogsTab", () => {
  it("no rompe con lista vacía y muestra estado vacío", () => {
    render(<AuditLogsTab logs={[]} />);
    expect(
      screen.getByText(/No hay eventos de auditoría registrados/i),
    ).toBeInTheDocument();
  });

  it("muestra etiqueta en español, qué pasó y recurso", () => {
    render(<AuditLogsTab logs={[sampleLog]} />);
    expect(screen.getByText("Renombre de identificador")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Renombró el identificador de documentacion-cliente a docs.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Aplicación docs")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ver detalle/i }),
    ).toBeInTheDocument();
  });
});
