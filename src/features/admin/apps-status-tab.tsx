import { useState } from "react";
import type { AppStatus } from "../../shared/auth/access-types";
import type {
  AdminAppItem,
  AdminRoleItem,
  UpsertAdminAppPayload,
} from "./api/admin-api";
import { RegisterAppModal } from "./register-app-modal";

interface AppsStatusTabProps {
  readonly apps: readonly AdminAppItem[];
  readonly roles: readonly AdminRoleItem[];
  readonly canEditId?: boolean;
  readonly onRenameId?: (appId: string, newId: string) => Promise<void>;
  readonly onUpdateStatus: (appId: string, status: AppStatus) => Promise<void>;
  readonly onUpsertApp: (payload: UpsertAdminAppPayload) => Promise<void>;
}

const STATUS_BADGE: Readonly<
  Record<AppStatus, { readonly label: string; readonly className: string }>
> = {
  active: {
    label: "Activa",
    className:
      "border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] text-[var(--state-success)]",
  },
  maintenance: {
    label: "En mantenimiento (solo administrador)",
    className:
      "border-[var(--state-warning)]/30 bg-[var(--alert-warning-bg)] text-[var(--state-warning)]",
  },
  disabled: {
    label: "En construcción",
    className:
      "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)]",
  },
  hidden: {
    label: "Oculta del portal",
    className:
      "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)]",
  },
};

export const AppsStatusTab = ({
  apps,
  roles,
  canEditId = false,
  onRenameId,
  onUpdateStatus,
  onUpsertApp,
}: AppsStatusTabProps) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdminAppItem | null>(null);

  const handleStatusChange = async (appId: string, nextStatus: AppStatus) => {
    setErrorMsg(null);
    setUpdatingId(appId);
    try {
      await onUpdateStatus(appId, nextStatus);
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado de la aplicación.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-body)]">
            Catálogo de herramientas del portal
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Activa, pon en mantenimiento o registra nuevas herramientas para que
            aparezcan en el portal y en la matriz de permisos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingApp(null);
            setModalOpen(true);
          }}
          className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-action-hover)] cursor-pointer"
        >
          + Registrar nueva herramienta
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-xs font-medium text-[var(--state-error)]">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {apps.map((app) => {
          const badge = STATUS_BADGE[app.status];
          const isUpdating = updatingId === app.id;

          return (
            <div
              key={app.id}
              style={{ boxShadow: "var(--shadow-1)" }}
              className="flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5"
            >
              <div>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--text-body)]">
                        {app.name}
                      </h3>
                      <span className="font-mono text-xs text-[var(--color-primary)]">
                        ({app.id})
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      Ruta: {app.route}
                    </span>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-[var(--text-muted)]">
                  {app.description}
                </p>

                <div className="mb-4 space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Permisos configurados en esta herramienta:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {app.actions.map((act) => (
                      <span
                        key={act.actionCode}
                        className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-0.5 text-[11px] text-[var(--text-body)]"
                      >
                        <strong>{act.name}</strong>{" "}
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">
                          ({act.actionCode})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-[var(--border-default)] pt-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    setEditingApp(app);
                    setModalOpen(true);
                  }}
                  className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3.5 py-1.5 text-xs font-bold text-[var(--text-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  Editar ficha y acciones
                </button>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`status-select-${app.id}`}
                    className="text-xs font-semibold text-[var(--text-body)]"
                  >
                    Estado:
                  </label>
                  <select
                    id={`status-select-${app.id}`}
                    disabled={isUpdating}
                    value={app.status}
                    onChange={(e) =>
                      void handleStatusChange(
                        app.id,
                        e.target.value as AppStatus,
                      )
                    }
                    className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-bold text-[var(--text-body)] disabled:opacity-50"
                  >
                    <option value="active">Activa (disponible)</option>
                    <option value="maintenance">
                      En mantenimiento (solo administrador)
                    </option>
                    <option value="disabled">En construcción</option>
                    <option value="hidden">Oculta del portal</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <RegisterAppModal
          initialApp={editingApp}
          roles={roles}
          canEditId={canEditId}
          onRenameId={onRenameId}
          onSave={onUpsertApp}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};
