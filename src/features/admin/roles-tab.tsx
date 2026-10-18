import { useState } from "react";
import type {
  AdminAppItem,
  AdminRoleItem,
  UpsertAdminRolePayload,
} from "./api/admin-api";
import { RoleFormModal } from "./role-form-modal";

interface RolesTabProps {
  readonly roles: readonly AdminRoleItem[];
  readonly apps: readonly AdminAppItem[];
  readonly canManageApps: boolean;
  readonly onSaveRole: (
    roleId: string,
    payload: UpsertAdminRolePayload,
  ) => Promise<void>;
  readonly onDeleteRole: (roleId: string) => Promise<void>;
}

export const RolesTab = ({
  roles,
  apps,
  canManageApps,
  onSaveRole,
  onDeleteRole,
}: RolesTabProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRoleItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async (role: AdminRoleItem) => {
    setErrorMsg(null);
    setDeletingId(role.id);
    try {
      await onDeleteRole(role.id);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "No se pudo eliminar el rol.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-body)]">
            Plantillas de Roles del Portal
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Cada rol define un paquete de herramientas y acciones que heredan
            automáticamente los usuarios que lo tengan asignado.
          </p>
        </div>

        {canManageApps && (
          <button
            type="button"
            onClick={() => {
              setEditingRole(null);
              setModalOpen(true);
            }}
            className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
          >
            + Crear nuevo rol
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-xs font-medium text-[var(--state-error)]">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const appsWithAccess = apps.filter((app) => {
            if (role.id === "admin") return true;
            return role.defaultPermissions.some(
              (p) => p.appId === app.id && p.actionCode === "view",
            );
          });

          return (
            <div
              key={role.id}
              style={{ boxShadow: "var(--shadow-1)" }}
              className="flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--text-body)]">
                        {role.name}
                      </h3>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        ({role.id})
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      Nivel jerárquico:{" "}
                      <strong className="text-[var(--color-primary)]">
                        {role.hierarchyLevel}
                      </strong>{" "}
                      &bull; {role.usersCount}{" "}
                      {role.usersCount === 1 ? "usuario" : "usuarios"}
                    </span>
                  </div>

                  {role.isSystemRole && (
                    <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Rol base
                    </span>
                  )}
                </div>

                <p className="mb-4 text-xs leading-relaxed text-[var(--text-muted)]">
                  {role.description}
                </p>

                <div className="mb-4 space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Herramientas que incluye de fábrica:
                  </span>

                  {appsWithAccess.length === 0 ? (
                    <span className="inline-block rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                      Ninguna herramienta por defecto
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      {appsWithAccess.map((app) => {
                        const actionsForApp =
                          role.id === "admin"
                            ? app.actions
                            : app.actions.filter((act) =>
                                role.defaultPermissions.some(
                                  (p) =>
                                    p.appId === app.id &&
                                    p.actionCode === act.actionCode,
                                ),
                              );
                        const extraActions = actionsForApp.filter(
                          (a) => a.actionCode !== "view",
                        );

                        return (
                          <div
                            key={app.id}
                            className="rounded-[var(--radius-1)] border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)]/50 px-3 py-1.5 text-xs"
                          >
                            <div className="font-bold text-[var(--state-success)]">
                              ✓ {app.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                              {extraActions.length > 0
                                ? `Incluye: ${extraActions.map((a) => a.name).join(", ")}`
                                : "Solo acceso de consulta (view)"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {canManageApps && (
                <div className="flex items-center justify-between gap-2 border-t border-[var(--border-default)] pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRole(role);
                      setModalOpen(true);
                    }}
                    className="flex-1 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-bold text-[var(--text-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
                  >
                    Editar permisos del rol
                  </button>

                  {!role.isSystemRole && (
                    <button
                      type="button"
                      disabled={deletingId === role.id}
                      onClick={() => void handleDelete(role)}
                      className="rounded-[var(--radius-pill)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] px-3 py-1.5 text-xs font-bold text-[var(--state-error)] hover:bg-[var(--state-error)] hover:text-white disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === role.id ? "..." : "Eliminar"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <RoleFormModal
          initialRole={editingRole}
          apps={apps}
          onSave={onSaveRole}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};
