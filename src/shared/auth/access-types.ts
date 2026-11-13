export type RoleId = string;

export type AppStatus = "active" | "maintenance" | "disabled" | "hidden";

export type AppIconType = "diagnostico" | "pubsub" | "auditoria" | "docs";

export interface EffectiveAppAccess {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly route: string;
  readonly icon: AppIconType;
  readonly tags: readonly string[];
  readonly status: AppStatus;
  readonly displayOrder: number;
  readonly canAccess: boolean;
  readonly allowedActions: readonly string[];
}

export interface EffectiveUserAccess {
  readonly email: string;
  readonly displayName: string | null;
  readonly roleId: RoleId;
  readonly isSuperAdmin: boolean;
  readonly canManageApps: boolean;
  readonly canManageUsers: boolean;
  readonly apps: readonly EffectiveAppAccess[];
}

export const DEFAULT_APPS_CATALOG: readonly EffectiveAppAccess[] = [
  {
    id: "diagnostico",
    name: "Diagnóstico de Migración",
    description:
      "Auditoría integral y trazabilidad de remisiones y despachos en el flujo hacia CM. Permite evaluar checks y reintentar guías.",
    route: "/diagnostico",
    icon: "diagnostico",
    tags: ["Remisiones", "Despachos", "Re-migración"],
    status: "active",
    displayOrder: 10,
    canAccess: true,
    allowedActions: ["view", "remigrate"],
  },
  {
    id: "logs",
    name: "Visor de Logs GKE",
    description:
      "Auditoría en tiempo real de clusters, namespaces y cargas de trabajo en Kubernetes (Prod y Test).",
    route: "/logs",
    icon: "pubsub",
    tags: ["Kubernetes", "Troubleshooting", "GCP"],
    status: "active",
    displayOrder: 20,
    canAccess: true,
    allowedActions: ["view", "view_prod"],
  },
  {
    id: "docs",
    name: "Documentación de APIs",
    description:
      "Consulta la especificación OpenAPI vigente de las APIs de integración, con acceso controlado. Reemplaza el envío de archivos PDF.",
    route: "/docs",
    icon: "docs",
    tags: ["OpenAPI", "Integraciones", "Catálogo"],
    status: "active",
    displayOrder: 25,
    canAccess: true,
    allowedActions: ["view", "publish", "manage"],
  },
  {
    id: "auditoria",
    name: "Auditoría de Facturación",
    description:
      "Validación de coherencia en remesas facturadas frente a registros maestros de despachos.",
    route: "/auditoria",
    icon: "auditoria",
    tags: ["Facturas", "Consistencia", "Auditoría"],
    status: "disabled",
    displayOrder: 30,
    canAccess: false,
    allowedActions: [],
  },
];

export const buildFallbackAccessProfile = (
  email = "dev.local@coordinadora.com",
): EffectiveUserAccess => ({
  email,
  displayName: "Desarrollador Local",
  roleId: "admin",
  isSuperAdmin: true,
  canManageApps: true,
  canManageUsers: true,
  apps: DEFAULT_APPS_CATALOG,
});

export const buildRestrictedFallbackAccessProfile = (
  email = "operador@coordinadora.com",
): EffectiveUserAccess => ({
  email,
  displayName: null,
  roleId: "user",
  isSuperAdmin: false,
  canManageApps: false,
  canManageUsers: false,
  apps: DEFAULT_APPS_CATALOG.map((app) => ({
    ...app,
    canAccess: app.status === "active",
    allowedActions: app.status === "active" ? ["view"] : [],
  })),
});
