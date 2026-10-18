import { useMemo, useState, type FormEvent } from "react";
import type { RoleId } from "../../shared/auth/access-types";
import type {
  AdminAppItem,
  AdminRoleItem,
  AdminUserItem,
  UpsertAdminUserPayload,
  UserPermissionOverrideItem,
} from "./api/admin-api";

interface UserPermissionsModalProps {
  readonly actorEmail: string;
  readonly actorRoleId: RoleId;
  readonly actorIsSuperAdmin: boolean;
  readonly initialUser: AdminUserItem | null;
  readonly apps: readonly AdminAppItem[];
  readonly roles: readonly AdminRoleItem[];
  readonly onSave: (
    email: string,
    payload: UpsertAdminUserPayload,
  ) => Promise<void>;
  readonly onClose: () => void;
}

type OverrideChoice = "inherit" | "allow" | "deny";

const buildOverrideKey = (appId: string, actionCode: string): string =>
  `${appId}::${actionCode}`;

export const UserPermissionsModal = ({
  actorEmail,
  actorRoleId,
  actorIsSuperAdmin,
  initialUser,
  apps,
  roles,
  onSave,
  onClose,
}: UserPermissionsModalProps) => {
  const isEditing = Boolean(initialUser);
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [displayName, setDisplayName] = useState(
    initialUser?.displayName ?? "",
  );
  const [roleId, setRoleId] = useState<RoleId>(initialUser?.roleId ?? "user");
  const [isBlocked, setIsBlocked] = useState(initialUser?.isBlocked ?? false);
  const [notes, setNotes] = useState(initialUser?.notes ?? "");
  const [overridesMap, setOverridesMap] = useState<
    Record<string, OverrideChoice>
  >(() => {
    const map: Record<string, OverrideChoice> = {};
    for (const perm of initialUser?.permissions ?? []) {
      map[buildOverrideKey(perm.appId, perm.actionCode)] = perm.isAllowed
        ? "allow"
        : "deny";
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSelf = email.trim().toLowerCase() === actorEmail.trim().toLowerCase();
  const actorRoleObj = roles.find((r) => r.id === actorRoleId);
  const actorLevel = actorIsSuperAdmin
    ? 100
    : (actorRoleObj?.hierarchyLevel ?? 50);

  const selectableRoles = useMemo(
    () =>
      roles.filter((r) => {
        if (actorIsSuperAdmin || actorRoleId === "admin") return true;
        return r.hierarchyLevel < actorLevel;
      }),
    [roles, actorIsSuperAdmin, actorRoleId, actorLevel],
  );

  const isActionIncludedInRole = (
    app: AdminAppItem,
    actionCode: string,
    targetRole: RoleId,
  ): boolean => {
    if (targetRole === "admin") return true;
    const roleDef = roles.find((r) => r.id === targetRole);
    if (roleDef) {
      return roleDef.defaultPermissions.some(
        (p) => p.appId === app.id && p.actionCode === actionCode,
      );
    }
    const act = app.actions.find((a) => a.actionCode === actionCode);
    return act?.defaultRoles.includes(targetRole) ?? false;
  };

  const isEffectiveActionAllowed = (
    app: AdminAppItem,
    actionCode: string,
  ): boolean => {
    if (isBlocked) return false;
    if (roleId === "admin") return true;
    const choice =
      overridesMap[buildOverrideKey(app.id, actionCode)] ?? "inherit";
    if (choice === "allow") return true;
    if (choice === "deny") return false;
    return isActionIncludedInRole(app, actionCode, roleId);
  };

  const handleOverrideChange = (
    appId: string,
    actionCode: string,
    choice: OverrideChoice,
  ) => {
    setOverridesMap((prev) => ({
      ...prev,
      [buildOverrideKey(appId, actionCode)]: choice,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@coordinadora.com")) {
      setErrorMsg("El correo debe pertenecer al dominio @coordinadora.com.");
      return;
    }

    const permissions: UserPermissionOverrideItem[] = [];
    for (const [key, choice] of Object.entries(overridesMap)) {
      if (choice === "inherit") continue;
      const [appId, actionCode] = key.split("::");
      if (!appId || !actionCode) continue;
      permissions.push({
        appId,
        actionCode,
        isAllowed: choice === "allow",
      });
    }

    setSaving(true);
    try {
      await onSave(normalizedEmail, {
        displayName: displayName.trim() || null,
        roleId,
        isBlocked,
        notes: notes.trim() || null,
        permissions,
      });
      onClose();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los permisos del usuario.",
      );
    } finally {
      setSaving(false);
    }
  };

  const effectiveSummary = useMemo(() => {
    if (isBlocked) return [];
    return apps
      .filter((app) => isEffectiveActionAllowed(app, "view"))
      .map((app) => {
        const extra = app.actions
          .filter(
            (a) =>
              a.actionCode !== "view" &&
              isEffectiveActionAllowed(app, a.actionCode),
          )
          .map((a) => a.name);
        return {
          appName: app.name,
          status: app.status,
          extraLabel: extra.length > 0 ? extra.join(", ") : "Solo consulta",
        };
      });
  }, [apps, roleId, overridesMap, isBlocked]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-user-permissions-title"
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
              id="modal-user-permissions-title"
              className="text-lg font-bold text-[var(--text-body)]"
            >
              {isEditing
                ? `Configurar accesos de ${initialUser?.email}`
                : "Autorizar usuario corporativo"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Paso 1: Elige su rol base &bull; Paso 2: Ajusta a qué herramientas
              entra y qué puede hacer adentro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
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

          {/* Datos del usuario */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Correo corporativo (@coordinadora.com)
              </span>
              <input
                type="email"
                required
                disabled={isEditing}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@coordinadora.com"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Nombre o cargo visible
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Analista de Soporte N1"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>
          </div>

          {/* Paso 1: Selector visual de Rol */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-body)]">
                1. Rol base del usuario (Plantilla de permisos)
              </span>
              {Object.keys(overridesMap).length > 0 && (
                <button
                  type="button"
                  onClick={() => setOverridesMap({})}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  Restablecer todo a lo que diga el rol
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {selectableRoles.map((r) => {
                const isSelected = roleId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={isSelf}
                    onClick={() => setRoleId(r.id)}
                    className={`flex flex-col justify-between rounded-[var(--radius-2)] border p-3 text-left transition cursor-pointer disabled:opacity-60 ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--border-default)] bg-[var(--surface-sunken)]/50 hover:border-[var(--color-primary)]/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[var(--text-body)]">
                          {r.name}
                        </span>
                        <span className="rounded-full bg-[var(--surface-card)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-primary)]">
                          Nv. {r.hierarchyLevel}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--text-muted)]">
                        {r.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paso 2: Acceso por Herramienta (Nivel 1) y Funciones Internas (Nivel 2) */}
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-body)]">
                2. Acceso por herramienta completa y funciones internas
              </span>
              <p className="text-xs text-[var(--text-muted)]">
                Primero decide si el usuario puede{" "}
                <strong>entrar a la herramienta completa</strong>. Si tiene
                acceso, abajo aparecerán las funciones internas de esa
                herramienta.
              </p>
            </div>

            {apps.map((app) => {
              const viewIncludedByRole = isActionIncludedInRole(
                app,
                "view",
                roleId,
              );
              const viewChoice =
                overridesMap[buildOverrideKey(app.id, "view")] ?? "inherit";
              const canEnterApp = isEffectiveActionAllowed(app, "view");
              const subActions = app.actions.filter(
                (a) => a.actionCode !== "view",
              );

              return (
                <div
                  key={app.id}
                  className={`rounded-[var(--radius-2)] border p-4 transition-colors ${
                    canEnterApp
                      ? "border-[var(--state-success)]/40 bg-[var(--surface-card)]"
                      : "border-[var(--border-default)] bg-[var(--surface-sunken)]/40"
                  }`}
                >
                  {/* NIVEL 1: Herramienta completa */}
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-body)]">
                          {app.name}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          {app.route}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            canEnterApp
                              ? "border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] text-[var(--state-success)]"
                              : "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)]"
                          }`}
                        >
                          {canEnterApp
                            ? "✓ Puede entrar a la herramienta"
                            : "✕ Sin acceso a la herramienta"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        Por su rol ({roleId}):{" "}
                        <strong>
                          {viewIncludedByRole
                            ? "Incluida por defecto"
                            : "No incluida por defecto"}
                        </strong>
                      </p>
                    </div>

                    {roleId !== "admin" && (
                      <div
                        className="inline-flex shrink-0 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-0.5 text-xs"
                        role="group"
                        aria-label={`Acceso herramienta ${app.name}`}
                      >
                        {(
                          [
                            {
                              id: "inherit",
                              label: `Por rol (${viewIncludedByRole ? "Sí" : "No"})`,
                            },
                            { id: "allow", label: "Dar acceso" },
                            { id: "deny", label: "Bloquear" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleOverrideChange(app.id, "view", opt.id)
                            }
                            className={`rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-bold transition cursor-pointer ${
                              viewChoice === opt.id
                                ? opt.id === "deny"
                                  ? "bg-[var(--state-error)] text-white"
                                  : opt.id === "allow"
                                    ? "bg-[var(--state-success)] text-white"
                                    : "bg-[var(--color-primary)] text-white"
                                : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NIVEL 2: Sub-acciones internas (solo si puede entrar a la herramienta) */}
                  {canEnterApp && subActions.length > 0 && (
                    <div className="mt-3 border-t border-[var(--border-default)] pt-3">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Funciones especiales dentro de {app.name}:
                      </span>

                      <div className="space-y-2">
                        {subActions.map((action) => {
                          const key = buildOverrideKey(
                            app.id,
                            action.actionCode,
                          );
                          const choice = overridesMap[key] ?? "inherit";
                          const includedInRole = isActionIncludedInRole(
                            app,
                            action.actionCode,
                            roleId,
                          );
                          const effectiveSub = isEffectiveActionAllowed(
                            app,
                            action.actionCode,
                          );

                          return (
                            <div
                              key={action.actionCode}
                              className="flex flex-col justify-between gap-2 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/50 p-2.5 sm:flex-row sm:items-center"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-[var(--text-body)]">
                                    {action.name}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      effectiveSub
                                        ? "bg-[var(--alert-success-bg)] text-[var(--state-success)]"
                                        : "bg-[var(--surface-card)] text-[var(--text-muted)]"
                                    }`}
                                  >
                                    {effectiveSub
                                      ? "Habilitada"
                                      : "Solo lectura / Deshabilitada"}
                                  </span>
                                </div>
                                {action.description && (
                                  <p className="text-[11px] text-[var(--text-muted)]">
                                    {action.description}
                                  </p>
                                )}
                              </div>

                              {roleId !== "admin" && (
                                <select
                                  aria-label={`Permiso ${app.id} ${action.actionCode}`}
                                  value={choice}
                                  onChange={(e) =>
                                    handleOverrideChange(
                                      app.id,
                                      action.actionCode,
                                      e.target.value as OverrideChoice,
                                    )
                                  }
                                  className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-body)]"
                                >
                                  <option value="inherit">
                                    Por rol (
                                    {includedInRole
                                      ? "Habilitada"
                                      : "No incluida"}
                                    )
                                  </option>
                                  <option value="allow">
                                    Habilitar para este usuario
                                  </option>
                                  <option value="deny">
                                    Bloquear para este usuario
                                  </option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Notas o motivo de autorización
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Autorizado para turno contingencia"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBlocked}
                  disabled={isSelf}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="size-4 rounded-[2px] border-[var(--border-default)] text-[var(--state-error)]"
                />
                <span className="text-xs font-semibold text-[var(--text-body)]">
                  Suspender / bloquear acceso total al portal
                </span>
              </label>
            </div>
          </div>

          {/* Resumen en vivo de qué verá el usuario */}
          <div className="rounded-[var(--radius-2)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/30 p-4">
            <span className="block text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Vista previa del resultado para este usuario:
            </span>
            {isBlocked ? (
              <p className="mt-1 text-xs font-semibold text-[var(--state-error)]">
                ⛔ Cuenta suspendida: al iniciar sesión verá la pantalla de
                Acceso Restringido y no podrá entrar al Hub.
              </p>
            ) : effectiveSummary.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--state-warning)]">
                ⚠️ Podrá entrar al Hub pero verá todas las herramientas con
                &ldquo;Permiso requerido&rdquo;.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {effectiveSummary.map((item) => (
                  <span
                    key={item.appName}
                    className="rounded-[var(--radius-pill)] border border-[var(--state-success)]/40 bg-[var(--surface-card)] px-3 py-1 text-xs text-[var(--text-body)]"
                  >
                    <strong className="text-[var(--state-success)]">
                      ✓ {item.appName}:
                    </strong>{" "}
                    {item.extraLabel}
                  </span>
                ))}
              </div>
            )}
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
              {saving ? "Guardando..." : "Guardar permisos"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};
