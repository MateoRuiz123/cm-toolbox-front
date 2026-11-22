import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { useAccess } from "../../shared/auth/access-context";
import type { AppStatus } from "../../shared/auth/access-types";
import { esAuthBypassActivo } from "../../shared/auth/auth-bypass";
import {
  deleteAdminRole,
  deleteAdminUser,
  fetchAdminApps,
  fetchAdminAuditLogs,
  fetchAdminRoles,
  fetchAdminUsers,
  renameAdminAppId,
  updateAdminAppStatus,
  upsertAdminApp,
  upsertAdminRole,
  upsertAdminUser,
  type AdminAppItem,
  type AdminRoleItem,
  type AdminUserItem,
  type AuditLogItem,
  type UpsertAdminAppPayload,
  type UpsertAdminRolePayload,
  type UpsertAdminUserPayload,
} from "./api/admin-api";
import { AppsStatusTab } from "./apps-status-tab";
import { AuditLogsTab } from "./audit-logs-tab";
import { describeAuditEvent, labelAuditEvent } from "./audit-summary";
import { RolesTab } from "./roles-tab";
import { UsersPermissionsTab } from "./users-permissions-tab";
import { Skeleton, SkeletonRegion } from "@/shared/ui/skeleton";

type AdminTab = "users" | "roles" | "apps" | "audit";

const DEFAULT_FALLBACK_ROLES: readonly AdminRoleItem[] = [
  {
    id: "admin",
    name: "Administrador",
    description:
      "Control total: activa/desactiva aplicaciones, entra a apps en mantenimiento y administra cualquier usuario.",
    hierarchyLevel: 100,
    canManageApps: true,
    canManageUsers: true,
    isSystemRole: true,
    usersCount: 1,
    defaultPermissions: [],
  },
  {
    id: "sub_admin",
    name: "Sub-Administrador",
    description:
      "Delega y asigna permisos a usuarios operativos sobre aplicaciones activas sin apagar apps ni modificar admins.",
    hierarchyLevel: 50,
    canManageApps: false,
    canManageUsers: true,
    isSystemRole: false,
    usersCount: 1,
    defaultPermissions: [
      { appId: "diagnostico", actionCode: "view" },
      { appId: "diagnostico", actionCode: "remigrate" },
      { appId: "logs", actionCode: "view" },
    ],
  },
  {
    id: "user",
    name: "Usuario Operativo",
    description:
      "Accede a las aplicaciones activas según los permisos de su rol o asignaciones puntuales.",
    hierarchyLevel: 10,
    canManageApps: false,
    canManageUsers: false,
    isSystemRole: true,
    usersCount: 1,
    defaultPermissions: [{ appId: "diagnostico", actionCode: "view" }],
  },
];

export const AdminPage = () => {
  const {
    profile,
    roleId,
    isSuperAdmin,
    canManageApps,
    canManageUsers,
    devImpersonatedEmail,
    refreshAccess,
    switchDevUser,
  } = useAccess();

  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [quickQuery, setQuickQuery] = useState("");
  const [apps, setApps] = useState<readonly AdminAppItem[]>([]);
  const [roles, setRoles] = useState<readonly AdminRoleItem[]>(
    DEFAULT_FALLBACK_ROLES,
  );
  const [users, setUsers] = useState<readonly AdminUserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<readonly AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!canManageUsers && !canManageApps) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const [appsData, usersData, rolesData] = await Promise.all([
        fetchAdminApps(),
        fetchAdminUsers(),
        fetchAdminRoles().catch(() => DEFAULT_FALLBACK_ROLES),
      ]);
      setApps(appsData);
      setUsers(usersData);
      setRoles(rolesData);

      if (canManageApps) {
        const auditData = await fetchAdminAuditLogs(50, 0);
        setAuditLogs(auditData.items);
        setAuditTotal(auditData.total);
      }
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el microservicio de control de accesos (:8083).",
      );
    } finally {
      setLoading(false);
    }
  }, [canManageApps, canManageUsers]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleSaveUser = async (
    email: string,
    payload: UpsertAdminUserPayload,
  ) => {
    await upsertAdminUser(email, payload);
    await Promise.all([loadAdminData(), refreshAccess()]);
  };

  const handleDeleteUser = async (email: string) => {
    await deleteAdminUser(email);
    await Promise.all([loadAdminData(), refreshAccess()]);
  };

  const handleAuditFilterChange = async (filter: {
    readonly eventType?: string;
    readonly actorEmail?: string;
    readonly limit?: number;
  }) => {
    try {
      const auditData = await fetchAdminAuditLogs(filter.limit ?? 50, 0, {
        eventType: filter.eventType,
        actorEmail: filter.actorEmail,
      });
      setAuditLogs(auditData.items);
      setAuditTotal(auditData.total);
    } catch {
      // Mantiene los logs actuales si falla la recarga filtrada
    }
  };

  const handleSaveRole = async (
    targetRoleId: string,
    payload: UpsertAdminRolePayload,
  ) => {
    await upsertAdminRole(targetRoleId, payload);
    await Promise.all([loadAdminData(), refreshAccess()]);
  };

  const handleDeleteRole = async (targetRoleId: string) => {
    await deleteAdminRole(targetRoleId);
    await Promise.all([loadAdminData(), refreshAccess()]);
  };

  const handleUpdateAppStatus = async (appId: string, status: AppStatus) => {
    await updateAdminAppStatus(appId, status);
    await Promise.all([loadAdminData(), refreshAccess()]);
  };

  const handleRenameApp = async (appId: string, newId: string) => {
    await renameAdminAppId(appId, newId);
  };

  const handleUpsertApp = async (payload: UpsertAdminAppPayload) => {
    await upsertAdminApp(payload);
    await Promise.all([loadAdminData(), refreshAccess()]);
  };

  if (!canManageUsers && !canManageApps) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-12">
        <div
          style={{ boxShadow: "var(--shadow-1)" }}
          className="w-full rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center"
        >
          <SmoothTitleAccent
            as="h1"
            className="mb-2 text-xl font-bold tracking-tight text-[var(--text-body)] sm:text-2xl"
            accessibleTitle="Permiso requerido para Administración"
            before="Permiso requerido para "
            accent="Administración"
            amplitude={3}
          />
          <p className="mb-6 text-sm text-[var(--text-muted)]">
            Esta sección está reservada para Administradores y
            Sub-Administradores del portal.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-action)] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
          >
            Volver al portal
          </Link>
        </div>
      </div>
    );
  }

  const activeAppsCount = apps.filter((a) => a.status === "active").length;
  const maintenanceAppsCount = apps.filter(
    (a) => a.status === "maintenance",
  ).length;
  const activeUsersCount = users.filter((u) => !u.isBlocked).length;
  const activeUsersPercent =
    users.length > 0 ? Math.round((activeUsersCount / users.length) * 100) : 0;
  const activeAppsPercent =
    apps.length > 0 ? Math.round((activeAppsCount / apps.length) * 100) : 0;

  const trimmedQuery = quickQuery.trim().toLowerCase();
  const quickSearchMatches = trimmedQuery
    ? [
        ...users
          .filter(
            (u) =>
              u.email.toLowerCase().includes(trimmedQuery) ||
              (u.displayName?.toLowerCase().includes(trimmedQuery) ?? false),
          )
          .slice(0, 3)
          .map((u) => ({
            id: `u-${u.email}`,
            kind: "Usuario",
            title: u.displayName || u.email,
            subtitle: u.email,
            tab: "users" as AdminTab,
          })),
        ...roles
          .filter(
            (r) =>
              r.name.toLowerCase().includes(trimmedQuery) ||
              r.id.toLowerCase().includes(trimmedQuery),
          )
          .slice(0, 3)
          .map((r) => ({
            id: `r-${r.id}`,
            kind: "Rol",
            title: r.name,
            subtitle: r.id,
            tab: "roles" as AdminTab,
          })),
        ...(canManageApps
          ? apps
              .filter(
                (a) =>
                  a.name.toLowerCase().includes(trimmedQuery) ||
                  a.id.toLowerCase().includes(trimmedQuery) ||
                  a.route.toLowerCase().includes(trimmedQuery),
              )
              .slice(0, 3)
              .map((a) => ({
                id: `a-${a.id}`,
                kind: "Herramienta",
                title: a.name,
                subtitle: a.route,
                tab: "apps" as AdminTab,
              }))
          : []),
      ]
    : [];

  const recentLogs = auditLogs.slice(0, 3);
  const greetingName =
    profile.displayName?.trim() || profile.email.split("@")[0] || profile.email;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Cabecera Hero con degradado institucional y buscador rápido */}
      <section
        aria-label="Resumen ejecutivo de administración"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--azul-coordinadora) 0%, var(--azul-dark) 100%)",
          boxShadow: "var(--shadow-3)",
        }}
        className="relative overflow-hidden rounded-[var(--radius-3)] p-6 text-white sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 size-56 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                <span className="size-1.5 rounded-full bg-[var(--naranja-light)]" />
                Gobierno y Seguridad RBAC
              </span>
              <span className="text-xs font-medium text-white/85">
                Hola, {greetingName}
              </span>
            </div>

            <SmoothTitleAccent
              as="h1"
              className="mt-2 text-xl font-bold text-white sm:text-2xl"
              accessibleTitle="Administración de Accesos y Aplicaciones"
              before="Administración de "
              accent="Accesos y Aplicaciones"
              accentClassName="text-[var(--azul-100)]"
              amplitude={3}
            />
            <p className="mt-1 max-w-2xl text-xs text-white/85 sm:text-sm">
              Gestiona usuarios, plantillas de roles, herramientas registradas y
              actividad de auditoría del portal.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void loadAdminData()}
              className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--surface-card)] px-4 py-2 text-xs font-bold text-[var(--color-primary)] shadow-xs transition hover:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Actualizar datos
            </button>

            {esAuthBypassActivo() && (
              <div className="shrink-0 rounded-[var(--radius-2)] border border-white/20 bg-black/20 p-2.5 text-xs backdrop-blur-xs sm:min-w-[20rem]">
                <label
                  htmlFor="dev-role-simulator"
                  className="block font-bold text-white"
                >
                  Simulador de sesión local (Dev):
                </label>
                <select
                  id="dev-role-simulator"
                  value={devImpersonatedEmail ?? "dev.local@coordinadora.com"}
                  onChange={(e) => void switchDevUser(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] py-1.5 pl-3 pr-9 font-mono text-xs text-[var(--text-body)]"
                >
                  <option value="dev.local@coordinadora.com">
                    dev.local@coordinadora.com (Superadministrador)
                  </option>
                  <option value="subadmin.local@coordinadora.com">
                    subadmin.local@coordinadora.com (Subadministrador)
                  </option>
                  <option value="operador.local@coordinadora.com">
                    operador.local@coordinadora.com (Operador)
                  </option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Buscador flotante estilo dashboard moderno */}
        <div className="relative mt-5">
          <div className="relative flex items-center rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2.5 text-[var(--text-body)] shadow-sm">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              className="size-4 shrink-0 text-[var(--color-primary)]"
            >
              <circle cx="9" cy="9" r="5.5" strokeWidth="1.8" />
              <path
                d="m13.5 13.5 3.5 3.5"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Buscar acceso rápido: usuario, rol o herramienta..."
              aria-label="Buscador rápido de administración"
              className="ml-2.5 w-full bg-transparent text-xs text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:outline-none sm:text-sm"
            />
          </div>

          {trimmedQuery && (
            <div className="mt-2 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-2.5 text-[var(--text-body)] shadow-md">
              {quickSearchMatches.length === 0 ? (
                <p className="px-2 py-1 text-xs text-[var(--text-muted)]">
                  Sin coincidencias rápidas para “{quickQuery}”.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {quickSearchMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(match.tab);
                        setQuickQuery("");
                      }}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 text-xs transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      <span className="font-bold text-[var(--color-primary)]">
                        {match.kind}:
                      </span>
                      <span className="font-semibold">{match.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Tarjetas Quick Access estilo carpeta / categoría */}
      <section aria-label="Accesos rápidos y métricas">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-body)] sm:text-base">
            Accesos rápidos
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            Pulsa una categoría para ir al módulo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            style={{ boxShadow: "var(--shadow-1)" }}
            className={`group flex cursor-pointer flex-col justify-between rounded-[var(--radius-3)] border p-4 text-left transition hover:-translate-y-0.5 ${
              activeTab === "users"
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/55"
                : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/45"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-contrast)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="9" cy="7" r="4" strokeWidth="2" />
                </svg>
              </span>
              <span
                aria-hidden="true"
                className="text-sm text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
              >
                &rsaquo;
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Usuarios Activos
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-[var(--text-body)]">
                {activeUsersCount}{" "}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  / {users.length}
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            style={{ boxShadow: "var(--shadow-1)" }}
            className={`group flex cursor-pointer flex-col justify-between rounded-[var(--radius-3)] border p-4 text-left transition hover:-translate-y-0.5 ${
              activeTab === "roles"
                ? "border-[var(--color-primary)] bg-[var(--alert-info-bg)]/70"
                : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/45"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    d="M12 2 4 6v6c0 5.2 3.4 10 8 11 4.6-1 8-5.8 8-11V6l-8-4Z"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                aria-hidden="true"
                className="text-sm text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
              >
                &rsaquo;
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Roles Configurados
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-[var(--color-primary)]">
                {roles.length}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (canManageApps) setActiveTab("apps");
            }}
            style={{ boxShadow: "var(--shadow-1)" }}
            className={`group flex cursor-pointer flex-col justify-between rounded-[var(--radius-3)] border p-4 text-left transition hover:-translate-y-0.5 ${
              activeTab === "apps"
                ? "border-[var(--state-success)] bg-[var(--alert-success-bg)]/70"
                : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--state-success)]/45"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--alert-success-bg)] text-[var(--state-success)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                aria-hidden="true"
                className="text-sm text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
              >
                &rsaquo;
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Disponibles
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-[var(--state-success)]">
                {activeAppsCount}{" "}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  / {apps.length}
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (canManageApps) setActiveTab("apps");
            }}
            style={{ boxShadow: "var(--shadow-1)" }}
            className="group flex cursor-pointer flex-col justify-between rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--state-warning)]/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--alert-warning-bg)] text-[var(--state-warning)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    d="M12 9v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                aria-hidden="true"
                className="text-sm text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
              >
                &rsaquo;
              </span>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                En mantenimiento
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-[var(--state-warning)]">
                {maintenanceAppsCount}
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Workspace 2 columnas con panel lateral azul y contenido */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside
          aria-label="Navegación de administración"
          style={{
            backgroundImage:
              "linear-gradient(170deg, var(--azul-coordinadora) 0%, var(--azul-dark) 100%)",
            boxShadow: "var(--shadow-3)",
          }}
          className="rounded-[var(--radius-3)] p-5 text-white lg:sticky lg:top-20"
        >
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--surface-card)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary)] shadow-xs transition hover:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Volver al Hub del portal</span>
          </Link>

          <div
            className="mt-5 flex flex-row flex-wrap gap-1.5 lg:flex-col"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "users"}
              onClick={() => setActiveTab("users")}
              className={`flex cursor-pointer items-center justify-between rounded-[var(--radius-2)] px-3.5 py-2.5 text-left text-xs font-bold transition ${
                activeTab === "users"
                  ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-xs"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              <span>Usuarios y Accesos ({users.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "roles"}
              onClick={() => setActiveTab("roles")}
              className={`flex cursor-pointer items-center justify-between rounded-[var(--radius-2)] px-3.5 py-2.5 text-left text-xs font-bold transition ${
                activeTab === "roles"
                  ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-xs"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              <span>Roles y Plantillas ({roles.length})</span>
            </button>

            {canManageApps && (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "apps"}
                  onClick={() => setActiveTab("apps")}
                  className={`flex cursor-pointer items-center justify-between rounded-[var(--radius-2)] px-3.5 py-2.5 text-left text-xs font-bold transition ${
                    activeTab === "apps"
                      ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-xs"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <span>Aplicaciones del portal ({apps.length})</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "audit"}
                  onClick={() => setActiveTab("audit")}
                  className={`flex cursor-pointer items-center justify-between rounded-[var(--radius-2)] px-3.5 py-2.5 text-left text-xs font-bold transition ${
                    activeTab === "audit"
                      ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-xs"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <span>Auditoría ({auditLogs.length})</span>
                </button>
              </>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-white/20 pt-5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/75">
              Cobertura del portal
            </span>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-white/90">
                <span>Usuarios activos</span>
                <span>
                  {activeUsersCount} / {users.length}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${activeUsersPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-white/90">
                <span>Apps operativas</span>
                <span>
                  {activeAppsCount} / {apps.length}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[var(--naranja-light)] transition-all duration-300"
                  style={{ width: `${activeAppsPercent}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {errorMsg && (
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-2)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-4 text-xs text-[var(--state-error)]">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => void loadAdminData()}
                className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--state-error)]/40 bg-[var(--surface-card)] px-3 py-1 font-bold uppercase tracking-wider text-[var(--state-error)]"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <SkeletonRegion label="Cargando configuración de control de acceso...">
              <div
                aria-hidden="true"
                className="divide-y divide-[var(--border-default)]/60 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)]"
              >
                {[0, 1, 2, 3, 4].map((row) => (
                  <div
                    key={row}
                    className="flex items-center gap-4 px-4 py-3.5"
                  >
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="h-2.5 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
                  </div>
                ))}
              </div>
            </SkeletonRegion>
          ) : (
            <>
              {activeTab === "users" && (
                <UsersPermissionsTab
                  actorEmail={profile.email}
                  actorRoleId={roleId}
                  actorIsSuperAdmin={isSuperAdmin}
                  users={users}
                  apps={apps}
                  roles={roles}
                  onSaveUser={handleSaveUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {activeTab === "roles" && (
                <RolesTab
                  roles={roles}
                  apps={apps}
                  canManageApps={canManageApps}
                  onSaveRole={handleSaveRole}
                  onDeleteRole={handleDeleteRole}
                />
              )}

              {activeTab === "apps" && canManageApps && (
                <AppsStatusTab
                  apps={apps}
                  roles={roles}
                  canEditId={isSuperAdmin}
                  onRenameId={handleRenameApp}
                  onUpdateStatus={handleUpdateAppStatus}
                  onUpsertApp={handleUpsertApp}
                />
              )}

              {activeTab === "audit" && canManageApps && (
                <AuditLogsTab
                  logs={auditLogs}
                  total={auditTotal}
                  onFilterChange={(filter) =>
                    void handleAuditFilterChange(filter)
                  }
                />
              )}

              {canManageApps && activeTab !== "audit" && (
                <section
                  aria-label="Actividad reciente"
                  style={{ boxShadow: "var(--shadow-1)" }}
                  className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-[var(--text-body)]">
                      Actividad reciente
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("audit")}
                      className="cursor-pointer text-xs font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      Ver bitácora completa
                    </button>
                  </div>

                  {recentLogs.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Aún no se registran movimientos recientes en esta sesión.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-default)]/70">
                      {recentLogs.map((log) => {
                        const dt = new Date(log.createdAt);
                        const day = Number.isNaN(dt.getTime())
                          ? "--"
                          : String(dt.getDate()).padStart(2, "0");
                        const month = Number.isNaN(dt.getTime())
                          ? ""
                          : dt.toLocaleDateString("es-CO", { month: "short" });
                        return (
                          <div
                            key={log.id}
                            className="flex items-center gap-3.5 py-2.5 first:pt-0 last:pb-0"
                          >
                            <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--color-primary-soft)]/50 py-1 text-center">
                              <span className="text-[10px] font-bold uppercase text-[var(--color-primary)]">
                                {month}
                              </span>
                              <span className="text-sm font-extrabold leading-none text-[var(--text-body)]">
                                {day}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-[var(--text-body)]">
                                  {labelAuditEvent(log.eventType)}
                                </span>
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  por {log.actorEmail}
                                </span>
                              </div>
                              <p className="truncate text-xs text-[var(--text-muted)]">
                                {describeAuditEvent(log)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
