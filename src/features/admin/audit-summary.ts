import type { AuditLogItem } from "./api/admin-api";

const APP_STATUS_LABELS: Readonly<Record<string, string>> = {
  active: "Activa",
  maintenance: "En mantenimiento",
  disabled: "En construcción",
  hidden: "Oculta del portal",
};

const EVENT_LABELS: Readonly<Record<string, string>> = {
  APP_STATUS_CHANGED: "Cambio de estado",
  APP_ID_RENAMED: "Renombre de identificador",
  APP_UPSERTED: "Alta o actualización de herramienta",
  APPS_ORDER_UPDATED: "Actualización de orden global del portal",
  APP_OPENED: "Apertura de herramienta",
  APP_INCIDENT_REPORTED: "Reporte automático de incidencia",
  ROLE_UPSERTED: "Alta o actualización de rol",
  ROLE_DELETED: "Eliminación de rol",
  USER_ACCESS_UPDATED: "Actualización de acceso de usuario",
  USER_DELETED: "Eliminación de usuario",
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const statusLabel = (status: unknown): string => {
  const key = asString(status);
  if (!key) return "desconocido";
  return APP_STATUS_LABELS[key] ?? key;
};

const roleLabel = (roleId: unknown): string => {
  const id = asString(roleId);
  if (!id) return "sin rol";
  if (id === "admin") return "administrador";
  if (id === "sub_admin") return "subadministrador";
  if (id === "user") return "operador";
  return id;
};

const permissionsCount = (value: unknown): number =>
  Array.isArray(value) ? value.length : 0;

export const labelAuditEvent = (eventType: string): string =>
  EVENT_LABELS[eventType] ?? eventType;

export const describeAuditTarget = (
  targetType: AuditLogItem["targetType"],
  targetId: string,
): string => {
  if (targetType === "app") return `Aplicación ${targetId}`;
  if (targetType === "user") return `Usuario ${targetId}`;
  if (targetType === "role") return `Rol ${targetId}`;
  return `${targetType}: ${targetId}`;
};

export const describeAuditEvent = (log: AuditLogItem): string => {
  const before = asRecord(log.beforeState);
  const after = asRecord(log.afterState);

  switch (log.eventType) {
    case "APP_STATUS_CHANGED": {
      const appName =
        asString(after?.name) ?? asString(before?.name) ?? log.targetId;
      const from = statusLabel(before?.status);
      const to = statusLabel(after?.status);
      return `Cambió el estado de ${appName} de ${from} a ${to}.`;
    }
    case "APP_ID_RENAMED": {
      const from = asString(before?.id) ?? "anterior";
      const to = asString(after?.id) ?? log.targetId;
      return `Renombró el identificador de ${from} a ${to}.`;
    }
    case "APP_UPSERTED": {
      const name = asString(after?.name) ?? log.targetId;
      const route = asString(after?.route);
      const status = statusLabel(after?.status);
      if (!before) {
        return route
          ? `Registró la herramienta ${name} en ${route} (${status}).`
          : `Registró la herramienta ${name} (${status}).`;
      }
      return route
        ? `Actualizó la ficha de ${name} (ruta ${route}, estado ${status}).`
        : `Actualizó la ficha de ${name} (estado ${status}).`;
    }
    case "ROLE_UPSERTED": {
      const name = asString(after?.name) ?? log.targetId;
      const level = asNumber(after?.hierarchyLevel);
      if (!before) {
        return level !== null
          ? `Creó el rol ${name} (nivel ${level}).`
          : `Creó el rol ${name}.`;
      }
      return level !== null
        ? `Actualizó el rol ${name} (nivel ${level}).`
        : `Actualizó el rol ${name}.`;
    }
    case "ROLE_DELETED": {
      const name = asString(before?.name) ?? log.targetId;
      const reassigned = asNumber(before?.usersReassignedToUser);
      if (reassigned !== null && reassigned > 0) {
        return `Eliminó el rol ${name} y reasignó ${reassigned} usuario(s) al rol operador.`;
      }
      return `Eliminó el rol ${name}.`;
    }
    case "USER_ACCESS_UPDATED": {
      const role = roleLabel(after?.roleId);
      const blocked = asBoolean(after?.isBlocked);
      const permCount = permissionsCount(after?.permissions);
      const parts = [`rol ${role}`];
      if (blocked === true) parts.push("cuenta bloqueada");
      if (blocked === false) parts.push("cuenta activa");
      parts.push(
        permCount === 1
          ? "1 permiso puntual"
          : `${permCount} permisos puntuales`,
      );
      return `Actualizó el acceso de ${log.targetId}: ${parts.join(", ")}.`;
    }
    case "USER_DELETED": {
      const role = roleLabel(before?.roleId);
      return `Eliminó al usuario ${log.targetId} (rol previo: ${role}).`;
    }
    case "APPS_ORDER_UPDATED":
      return `Actualizó el orden global predeterminado y la disposición Bento del portal (${log.targetId}).`;
    case "APP_OPENED":
      return `Registró la apertura de la herramienta ${log.targetId}.`;
    case "APP_INCIDENT_REPORTED":
      return `Registró un reporte automático de incidencia para la herramienta ${log.targetId}.`;
    default:
      return `Registró el evento ${log.eventType} sobre ${describeAuditTarget(log.targetType, log.targetId)}.`;
  }
};
