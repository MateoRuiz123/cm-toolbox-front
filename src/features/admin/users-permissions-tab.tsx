import { useState } from "react";
import type { RoleId } from "../../shared/auth/access-types";
import type {
  AdminAppItem,
  AdminRoleItem,
  AdminUserItem,
  UpsertAdminUserPayload,
} from "./api/admin-api";
import { UserPermissionsModal } from "./user-permissions-modal";

interface UsersPermissionsTabProps {
  readonly actorEmail: string;
  readonly actorRoleId: RoleId;
  readonly actorIsSuperAdmin: boolean;
  readonly users: readonly AdminUserItem[];
  readonly apps: readonly AdminAppItem[];
  readonly roles: readonly AdminRoleItem[];
  readonly onSaveUser: (
    email: string,
    payload: UpsertAdminUserPayload,
  ) => Promise<void>;
}

export const UsersPermissionsTab = ({
  actorEmail,
  actorRoleId,
  actorIsSuperAdmin,
  users,
  apps,
  roles,
  onSaveUser,
}: UsersPermissionsTabProps) => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);

  const actorRoleObj = roles.find((r) => r.id === actorRoleId);
  const actorLevel = actorIsSuperAdmin
    ? 100
    : (actorRoleObj?.hierarchyLevel ?? 50);

  const computeUserAppAccess = (user: AdminUserItem, app: AdminAppItem) => {
    if (user.isBlocked || app.status === "disabled") {
      return { canEnter: false, extraActions: [] as string[] };
    }
    if (user.isSuperAdmin || user.roleId === "admin") {
      return {
        canEnter: true,
        extraActions: app.actions
          .filter((a) => a.actionCode !== "view")
          .map((a) => a.name),
      };
    }
    if (app.status === "maintenance") {
      return { canEnter: false, extraActions: [] as string[] };
    }

    const roleDef = roles.find((r) => r.id === user.roleId);
    const isActionAllowed = (actionCode: string): boolean => {
      const ov = user.permissions.find(
        (p) => p.appId === app.id && p.actionCode === actionCode,
      );
      if (ov) return ov.isAllowed;
      if (roleDef) {
        return roleDef.defaultPermissions.some(
          (p) => p.appId === app.id && p.actionCode === actionCode,
        );
      }
      const act = app.actions.find((a) => a.actionCode === actionCode);
      return act?.defaultRoles.includes(user.roleId) ?? false;
    };

    const canEnter = isActionAllowed("view");
    if (!canEnter) {
      return { canEnter: false, extraActions: [] as string[] };
    }

    const extraActions = app.actions
      .filter((a) => a.actionCode !== "view" && isActionAllowed(a.actionCode))
      .map((a) => a.name);

    return { canEnter: true, extraActions };
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.roleId !== roleFilter) return false;
    if (appFilter !== "all") {
      const targetApp = apps.find((a) => a.id === appFilter);
      if (targetApp && !computeUserAppAccess(u, targetApp).canEnter) {
        return false;
      }
    }
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName?.toLowerCase().includes(q) ?? false)
    );
  });

  const canActorEditTarget = (target: AdminUserItem): boolean => {
    if (target.isSuperAdmin) return false;
    if (actorIsSuperAdmin || actorRoleId === "admin") return true;
    const targetRoleObj = roles.find((r) => r.id === target.roleId);
    const targetLevel = targetRoleObj?.hierarchyLevel ?? 10;
    return targetLevel < actorLevel;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por correo o nombre..."
            aria-label="Buscar usuarios"
            className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3.5 py-2 text-sm text-[var(--text-body)] sm:max-w-xs"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filtrar por rol"
            className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
          >
            <option value="all">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </select>

          <select
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            aria-label="Filtrar por acceso a herramienta"
            className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
          >
            <option value="all">Cualquier herramienta</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                Con acceso a: {app.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setModalOpen(true);
          }}
          className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-action-hover)] cursor-pointer"
        >
          + Autorizar usuario
        </button>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol Asignado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">
                  Herramientas a las que tiene acceso efectivo
                </th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {filteredUsers.map((user) => {
                const editable = canActorEditTarget(user);
                const roleObj = roles.find((r) => r.id === user.roleId);
                const accessibleApps = apps
                  .map((app) => ({
                    app,
                    access: computeUserAppAccess(user, app),
                  }))
                  .filter((item) => item.access.canEnter);

                return (
                  <tr
                    key={user.email}
                    className="hover:bg-[var(--surface-sunken)]/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-xs font-bold text-[var(--text-body)]">
                        {user.email}
                      </div>
                      {user.displayName && (
                        <div className="text-xs text-[var(--text-muted)]">
                          {user.displayName}
                        </div>
                      )}
                      {user.notes && (
                        <div className="mt-0.5 text-[11px] italic text-[var(--text-muted)]">
                          {user.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
                          {roleObj?.name ?? user.roleId}
                        </span>
                        {user.isSuperAdmin && (
                          <span className="rounded-full border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--state-warning)]">
                            Super Admin (Protegido)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {user.isBlocked ? (
                        <span className="rounded-full border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--state-error)]">
                          Bloqueado
                        </span>
                      ) : (
                        <span className="rounded-full border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--state-success)]">
                          Activo
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {accessibleApps.length === 0 ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          Sin herramientas habilitadas
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {accessibleApps.map(({ app, access }) => (
                            <span
                              key={app.id}
                              className="rounded-[var(--radius-pill)] border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] px-2.5 py-0.5 text-[11px] text-[var(--text-body)]"
                            >
                              <strong className="text-[var(--state-success)]">
                                ✓ {app.name}
                              </strong>
                              {access.extraActions.length > 0 && (
                                <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                                  ({access.extraActions.join(", ")})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setModalOpen(true);
                          }}
                          className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-1.5 text-xs font-bold text-[var(--text-body)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
                        >
                          Configurar accesos
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[var(--text-muted)]">
                          Protegido por jerarquía
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    No se encontraron usuarios con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <UserPermissionsModal
          actorEmail={actorEmail}
          actorRoleId={actorRoleId}
          actorIsSuperAdmin={actorIsSuperAdmin}
          initialUser={editingUser}
          apps={apps}
          roles={roles}
          onSave={onSaveUser}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};
