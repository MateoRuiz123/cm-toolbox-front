import { useState, type FormEvent } from "react";
import type {
  AdminAppItem,
  AdminRoleItem,
  RoleDefaultPermissionItem,
  UpsertAdminRolePayload,
} from "./api/admin-api";

interface RoleFormModalProps {
  readonly initialRole: AdminRoleItem | null;
  readonly apps: readonly AdminAppItem[];
  readonly onSave: (
    roleId: string,
    payload: UpsertAdminRolePayload,
  ) => Promise<void>;
  readonly onClose: () => void;
}

const slugifyRoleId = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

const permKey = (appId: string, actionCode: string): string =>
  `${appId}::${actionCode}`;

export const RoleFormModal = ({
  initialRole,
  apps,
  onSave,
  onClose,
}: RoleFormModalProps) => {
  const isEditing = Boolean(initialRole);
  const isAdminSystem = initialRole?.id === "admin";

  const [name, setName] = useState(initialRole?.name ?? "");
  const [roleId, setRoleId] = useState(initialRole?.id ?? "");
  const [autoSlug, setAutoSlug] = useState(!isEditing);
  const [description, setDescription] = useState(
    initialRole?.description ?? "",
  );
  const [hierarchyLevel, setHierarchyLevel] = useState<number>(
    initialRole?.hierarchyLevel ?? 20,
  );
  const [canManageUsers, setCanManageUsers] = useState<boolean>(
    initialRole?.canManageUsers ?? false,
  );
  const [canManageApps, setCanManageApps] = useState<boolean>(
    initialRole?.canManageApps ?? false,
  );
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const p of initialRole?.defaultPermissions ?? []) {
      initial.add(permKey(p.appId, p.actionCode));
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug && !isEditing) {
      setRoleId(slugifyRoleId(value));
    }
  };

  const toggleAppAccess = (app: AdminAppItem, enabled: boolean) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.add(permKey(app.id, "view"));
      } else {
        for (const act of app.actions) {
          next.delete(permKey(app.id, act.actionCode));
        }
      }
      return next;
    });
  };

  const toggleSubAction = (
    appId: string,
    actionCode: string,
    enabled: boolean,
  ) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.add(permKey(appId, "view"));
        next.add(permKey(appId, actionCode));
      } else {
        next.delete(permKey(appId, actionCode));
      }
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    const cleanId = roleId.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(cleanId)) {
      setErrorMsg(
        "El código del rol solo debe usar letras minúsculas, números y guion bajo (ej. soporte_n2).",
      );
      return;
    }

    const defaultPermissions: RoleDefaultPermissionItem[] = [];
    for (const key of selectedPerms) {
      const [appId, actionCode] = key.split("::");
      if (appId && actionCode) {
        defaultPermissions.push({ appId, actionCode });
      }
    }

    setSaving(true);
    try {
      await onSave(cleanId, {
        name: name.trim(),
        description: description.trim(),
        hierarchyLevel: isAdminSystem ? 100 : hierarchyLevel,
        canManageApps: isAdminSystem ? true : canManageApps,
        canManageUsers: isAdminSystem ? true : canManageUsers || canManageApps,
        defaultPermissions,
      });
      onClose();
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "No se pudo guardar el rol.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-role-form-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        style={{ boxShadow: "var(--shadow-24)" }}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)]"
      >
        <header className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-sunken)] px-6 py-4">
          <div>
            <h2
              id="modal-role-form-title"
              className="text-lg font-bold text-[var(--text-body)]"
            >
              {isEditing
                ? `Configurar rol: ${initialRole?.name}`
                : "Crear nuevo rol / plantilla de permisos"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Define a qué herramientas y funciones tendrán acceso automático
              los usuarios con este rol.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de rol"
            className="rounded-[var(--radius-1)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-card)] hover:text-[var(--text-body)] cursor-pointer"
          >
            ✕
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto p-6"
        >
          {errorMsg && (
            <div className="rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-xs font-medium text-[var(--state-error)]">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Nombre del rol
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Soporte Nivel 2"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Código identificador (slug)
              </span>
              <input
                type="text"
                required
                disabled={isEditing}
                value={roleId}
                onChange={(e) => {
                  setAutoSlug(false);
                  setRoleId(e.target.value);
                }}
                placeholder="soporte_n2"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-sm text-[var(--text-body)] disabled:opacity-60"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-[var(--text-body)]">
              Descripción del rol (¿Para quién está pensado?)
            </span>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Equipo encargado de diagnosticar y re-encolar guías en contingencia"
              className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
            />
          </label>

          <div className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/60 p-4 space-y-3">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-bold text-[var(--text-body)]">
                  Nivel de rango jerárquico ({hierarchyLevel} / 100)
                </span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Un rol con permiso de gestionar usuarios solo puede editar a
                  roles de menor número.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { label: "Operativo (10)", val: 10 },
                  { label: "Analista (25)", val: 25 },
                  { label: "Supervisor (50)", val: 50 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    disabled={isAdminSystem}
                    onClick={() => setHierarchyLevel(preset.val)}
                    className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                      hierarchyLevel === preset.val
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min={1}
              max={99}
              disabled={isAdminSystem}
              value={isAdminSystem ? 100 : hierarchyLevel}
              onChange={(e) => setHierarchyLevel(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <label className="flex items-start gap-2.5 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isAdminSystem}
                  checked={isAdminSystem || canManageUsers || canManageApps}
                  onChange={(e) => setCanManageUsers(e.target.checked)}
                  className="mt-0.5 size-4 rounded-[2px] text-[var(--color-primary)]"
                />
                <div>
                  <span className="block text-xs font-bold text-[var(--text-body)]">
                    Puede administrar permisos de usuarios
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Habilita la pestaña de Usuarios en /admin para gestionar
                    cuentas de menor rango.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isAdminSystem}
                  checked={isAdminSystem || canManageApps}
                  onChange={(e) => {
                    setCanManageApps(e.target.checked);
                    if (e.target.checked) setCanManageUsers(true);
                  }}
                  className="mt-0.5 size-4 rounded-[2px] text-[var(--color-primary)]"
                />
                <div>
                  <span className="block text-xs font-bold text-[var(--text-body)]">
                    Puede administrar herramientas y roles
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Permite prender/apagar aplicaciones del Hub y editar roles.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-body)]">
                ¿A qué herramientas y funciones tendrá acceso este rol por
                defecto?
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Activa el interruptor principal de una herramienta para que el
                rol pueda entrar a ella, y luego marca qué acciones internas
                puede usar.
              </p>
            </div>

            {apps.map((app) => {
              const hasAppAccess =
                isAdminSystem || selectedPerms.has(permKey(app.id, "view"));
              const subActions = app.actions.filter(
                (a) => a.actionCode !== "view",
              );

              return (
                <div
                  key={app.id}
                  className={`rounded-[var(--radius-2)] border p-4 transition-colors ${
                    hasAppAccess
                      ? "border-[var(--color-primary)]/50 bg-[var(--surface-card)]"
                      : "border-[var(--border-default)] bg-[var(--surface-sunken)]/40 opacity-80"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-body)]">
                          {app.name}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          ({app.route})
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {app.description}
                      </p>
                    </div>

                    <label className="inline-flex shrink-0 items-center gap-2.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3.5 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={isAdminSystem}
                        checked={hasAppAccess}
                        onChange={(e) => toggleAppAccess(app, e.target.checked)}
                        className="size-4 rounded-[2px] text-[var(--color-primary)]"
                      />
                      <span
                        className={`text-xs font-bold ${
                          hasAppAccess
                            ? "text-[var(--state-success)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {hasAppAccess
                          ? "Acceso a herramienta: Sí"
                          : "Sin acceso a herramienta"}
                      </span>
                    </label>
                  </div>

                  {hasAppAccess && subActions.length > 0 && (
                    <div className="mt-3 border-t border-[var(--border-default)] pt-3">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Funcionalidades internas dentro de {app.name}:
                      </span>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {subActions.map((act) => {
                          const checked =
                            isAdminSystem ||
                            selectedPerms.has(permKey(app.id, act.actionCode));
                          return (
                            <label
                              key={act.actionCode}
                              className="flex items-start gap-2.5 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/60 p-2.5 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                disabled={isAdminSystem}
                                checked={checked}
                                onChange={(e) =>
                                  toggleSubAction(
                                    app.id,
                                    act.actionCode,
                                    e.target.checked,
                                  )
                                }
                                className="mt-0.5 size-4 rounded-[2px] text-[var(--color-primary)]"
                              />
                              <div>
                                <span className="block text-xs font-bold text-[var(--text-body)]">
                                  {act.name}
                                </span>
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                  Código: {act.actionCode}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] hover:bg-[var(--surface-sunken)] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[var(--color-primary-hover)] disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Guardando..." : "Guardar rol"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};
