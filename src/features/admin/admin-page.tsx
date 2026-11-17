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

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 sm:flex-row sm:items-center">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Gobierno y Seguridad RBAC
          </span>
          <SmoothTitleAccent
            as="h1"
            className="mt-1 text-xl font-bold text-[var(--text-body)] sm:text-2xl"
            accessibleTitle="Administración de Accesos y Aplicaciones"
            before="Administración de "
            accent="Accesos y Aplicaciones"
            amplitude={3}
          />
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
            Gestiona usuarios, plantillas de roles, nuevas herramientas del
            portal y bitácora de auditoría.
          </p>
        </div>

        {esAuthBypassActivo() && (
          <div className="shrink-0 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-3 text-xs sm:min-w-[24rem]">
            <label
              htmlFor="dev-role-simulator"
              className="block font-bold text-[var(--text-body)]"
            >
              Simulador de sesión local (Dev):
            </label>
            <select
              id="dev-role-simulator"
              value={devImpersonatedEmail ?? "dev.local@coordinadora.com"}
              onChange={(e) => void switchDevUser(e.target.value)}
              className="mt-1.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] py-1.5 pl-3 pr-9 font-mono text-xs text-[var(--text-body)]"
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

      {/* Tarjetas KPI de resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Usuarios Activos
          </span>
          <div className="mt-1 text-2xl font-extrabold text-[var(--text-body)]">
            {activeUsersCount}{" "}
            <span className="text-xs font-normal text-[var(--text-muted)]">
              / {users.length}
            </span>
          </div>
        </div>

        <div className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Roles Configurados
          </span>
          <div className="mt-1 text-2xl font-extrabold text-[var(--color-primary)]">
            {roles.length}
          </div>
        </div>

        <div className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Disponibles
          </span>
          <div className="mt-1 text-2xl font-extrabold text-[var(--state-success)]">
            {activeAppsCount}{" "}
            <span className="text-xs font-normal text-[var(--text-muted)]">
              / {apps.length}
            </span>
          </div>
        </div>

        <div className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            En mantenimiento
          </span>
          <div className="mt-1 text-2xl font-extrabold text-[var(--state-warning)]">
            {maintenanceAppsCount}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            className={`rounded-[var(--radius-pill)] px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === "users"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-on)] shadow-xs"
                : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            Usuarios y Accesos ({users.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "roles"}
            onClick={() => setActiveTab("roles")}
            className={`rounded-[var(--radius-pill)] px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === "roles"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-on)] shadow-xs"
                : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            Roles y Plantillas ({roles.length})
          </button>

          {canManageApps && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "apps"}
                onClick={() => setActiveTab("apps")}
                className={`rounded-[var(--radius-pill)] px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  activeTab === "apps"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-on)] shadow-xs"
                    : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
                }`}
              >
                Aplicaciones del portal ({apps.length})
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "audit"}
                onClick={() => setActiveTab("audit")}
                className={`rounded-[var(--radius-pill)] px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  activeTab === "audit"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-on)] shadow-xs"
                    : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
                }`}
              >
                Auditoría ({auditLogs.length})
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => void loadAdminData()}
          className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] hover:bg-[var(--surface-sunken)] cursor-pointer"
        >
          Actualizar datos
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-2)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-4 text-xs text-[var(--state-error)]">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadAdminData()}
            className="rounded-[var(--radius-pill)] border border-[var(--state-error)]/40 bg-[var(--surface-card)] px-3 py-1 font-bold uppercase tracking-wider text-[var(--state-error)] cursor-pointer"
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
              <div key={row} className="flex items-center gap-4 px-4 py-3.5">
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
              onFilterChange={(filter) => void handleAuditFilterChange(filter)}
            />
          )}
        </>
      )}
    </div>
  );
};
