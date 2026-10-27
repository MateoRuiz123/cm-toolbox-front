import { describe, expect, it } from "vitest";
import type { AuditLogItem } from "../../../src/features/admin/api/admin-api";
import {
  describeAuditEvent,
  describeAuditTarget,
  labelAuditEvent,
} from "../../../src/features/admin/audit-summary";

const baseLog = (
  partial: Partial<AuditLogItem> &
    Pick<AuditLogItem, "eventType" | "targetType" | "targetId">,
): AuditLogItem => ({
  id: "1",
  actorEmail: "admin@coordinadora.com",
  beforeState: null,
  afterState: {},
  createdAt: "2026-10-23T12:00:00.000Z",
  ...partial,
});

describe("labelAuditEvent", () => {
  it("traduce los 6 eventos conocidos", () => {
    expect(labelAuditEvent("APP_STATUS_CHANGED")).toBe("Cambio de estado");
    expect(labelAuditEvent("APP_ID_RENAMED")).toBe("Renombre de identificador");
    expect(labelAuditEvent("APP_UPSERTED")).toBe(
      "Alta o actualización de herramienta",
    );
    expect(labelAuditEvent("ROLE_UPSERTED")).toBe(
      "Alta o actualización de rol",
    );
    expect(labelAuditEvent("ROLE_DELETED")).toBe("Eliminación de rol");
    expect(labelAuditEvent("USER_ACCESS_UPDATED")).toBe(
      "Actualización de acceso de usuario",
    );
  });

  it("deja el código si el evento es desconocido", () => {
    expect(labelAuditEvent("CUSTOM_EVENT")).toBe("CUSTOM_EVENT");
  });
});

describe("describeAuditTarget", () => {
  it("formatea recurso en español", () => {
    expect(describeAuditTarget("app", "docs")).toBe("Aplicación docs");
    expect(describeAuditTarget("user", "a@b.com")).toBe("Usuario a@b.com");
    expect(describeAuditTarget("role", "operador")).toBe("Rol operador");
  });
});

describe("describeAuditEvent", () => {
  it("describe APP_STATUS_CHANGED", () => {
    const text = describeAuditEvent(
      baseLog({
        eventType: "APP_STATUS_CHANGED",
        targetType: "app",
        targetId: "auditoria",
        beforeState: { status: "disabled", name: "auditoria" },
        afterState: { status: "active", name: "auditoria" },
      }),
    );
    expect(text).toBe(
      "Cambió el estado de auditoria de En construcción a Activa.",
    );
  });

  it("describe APP_ID_RENAMED", () => {
    const text = describeAuditEvent(
      baseLog({
        eventType: "APP_ID_RENAMED",
        targetType: "app",
        targetId: "docs",
        beforeState: { id: "documentacion-cliente" },
        afterState: { id: "docs" },
      }),
    );
    expect(text).toBe(
      "Renombró el identificador de documentacion-cliente a docs.",
    );
  });

  it("describe APP_UPSERTED al crear", () => {
    const text = describeAuditEvent(
      baseLog({
        eventType: "APP_UPSERTED",
        targetType: "app",
        targetId: "docs",
        beforeState: null,
        afterState: {
          name: "Documentación",
          route: "/docs",
          status: "active",
        },
      }),
    );
    expect(text).toBe(
      "Registró la herramienta Documentación en /docs (Activa).",
    );
  });

  it("describe ROLE_UPSERTED y ROLE_DELETED", () => {
    expect(
      describeAuditEvent(
        baseLog({
          eventType: "ROLE_UPSERTED",
          targetType: "role",
          targetId: "operador_plus",
          beforeState: null,
          afterState: { name: "Operador plus", hierarchyLevel: 40 },
        }),
      ),
    ).toBe("Creó el rol Operador plus (nivel 40).");

    expect(
      describeAuditEvent(
        baseLog({
          eventType: "ROLE_DELETED",
          targetType: "role",
          targetId: "operador_plus",
          beforeState: {
            name: "Operador plus",
            usersReassignedToUser: 3,
          },
          afterState: {},
        }),
      ),
    ).toBe(
      "Eliminó el rol Operador plus y reasignó 3 usuario(s) al rol operador.",
    );
  });

  it("describe USER_ACCESS_UPDATED", () => {
    const text = describeAuditEvent(
      baseLog({
        eventType: "USER_ACCESS_UPDATED",
        targetType: "user",
        targetId: "correo@coordinadora.com",
        afterState: {
          roleId: "user",
          isBlocked: false,
          permissions: [{ appId: "docs", actionCode: "view" }],
        },
      }),
    );
    expect(text).toBe(
      "Actualizó el acceso de correo@coordinadora.com: rol operador, cuenta activa, 1 permiso puntual.",
    );
  });

  it("usa fallback para evento desconocido", () => {
    const text = describeAuditEvent(
      baseLog({
        eventType: "UNKNOWN_THING",
        targetType: "app",
        targetId: "docs",
      }),
    );
    expect(text).toBe(
      "Registró el evento UNKNOWN_THING sobre Aplicación docs.",
    );
  });
});
