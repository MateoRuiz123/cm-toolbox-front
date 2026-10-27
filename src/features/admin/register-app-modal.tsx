import { useState, type FormEvent } from "react";
import type { AppIconType, AppStatus } from "../../shared/auth/access-types";
import type {
  AdminAppActionItem,
  AdminAppItem,
  AdminRoleItem,
  UpsertAdminAppPayload,
} from "./api/admin-api";

interface RegisterAppModalProps {
  readonly initialApp: AdminAppItem | null;
  readonly roles: readonly AdminRoleItem[];
  readonly canEditId?: boolean;
  readonly onRenameId?: (appId: string, newId: string) => Promise<void>;
  readonly onSave: (payload: UpsertAdminAppPayload) => Promise<void>;
  readonly onClose: () => void;
}

const slugifyAppId = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const DEFAULT_VIEW_ACTION: AdminAppActionItem = {
  actionCode: "view",
  name: "Acceder a la herramienta",
  description: "Permite abrir y usar la pantalla principal de la herramienta.",
  defaultRoles: ["admin"],
};

export const RegisterAppModal = ({
  initialApp,
  roles,
  canEditId = false,
  onRenameId,
  onSave,
  onClose,
}: RegisterAppModalProps) => {
  const isEditing = Boolean(initialApp);

  const [name, setName] = useState(initialApp?.name ?? "");
  const [appId, setAppId] = useState(initialApp?.id ?? "");
  const [isExternalUrl, setIsExternalUrl] = useState<boolean>(() =>
    /^https?:\/\//i.test(initialApp?.route ?? ""),
  );
  const [route, setRoute] = useState(initialApp?.route ?? "/");
  const [autoSlug, setAutoSlug] = useState(!isEditing);
  const [description, setDescription] = useState(initialApp?.description ?? "");
  const [icon, setIcon] = useState<AppIconType>(
    initialApp?.icon ?? "diagnostico",
  );
  const [status, setStatus] = useState<AppStatus>(
    initialApp?.status ?? "active",
  );
  const [displayOrder, setDisplayOrder] = useState<number>(
    initialApp?.displayOrder ?? 40,
  );
  const [tagsRaw, setTagsRaw] = useState(
    initialApp?.tags.join(", ") ?? "Operación, Soporte",
  );
  const [actions, setActions] = useState<AdminAppActionItem[]>(() => {
    if (initialApp && initialApp.actions.length > 0) {
      return [...initialApp.actions];
    }
    return [DEFAULT_VIEW_ACTION];
  });

  const [newActionCode, setNewActionCode] = useState("");
  const [newActionName, setNewActionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug && !isEditing) {
      const slug = slugifyAppId(value);
      setAppId(slug);
      if (!isExternalUrl) {
        setRoute(slug ? `/${slug}` : "/");
      }
    }
  };

  const handleToggleRoleOnAction = (actionCode: string, roleId: string) => {
    if (roleId === "admin") return; // admin siempre incluido
    setActions((prev) =>
      prev.map((act) => {
        if (act.actionCode !== actionCode) return act;
        const has = act.defaultRoles.includes(roleId);
        const nextRoles = has
          ? act.defaultRoles.filter((r) => r !== roleId)
          : [...act.defaultRoles, roleId];
        return { ...act, defaultRoles: nextRoles };
      }),
    );
  };

  const handleAddAction = () => {
    const code = newActionCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    const label = newActionName.trim();
    if (!code || !label) return;
    if (actions.some((a) => a.actionCode === code)) {
      setErrorMsg(`La acción '${code}' ya existe en esta herramienta.`);
      return;
    }
    setErrorMsg(null);
    setActions((prev) => [
      ...prev,
      {
        actionCode: code,
        name: label,
        description: null,
        defaultRoles: ["admin"],
      },
    ]);
    setNewActionCode("");
    setNewActionName("");
  };

  const handleRemoveAction = (actionCode: string) => {
    if (actionCode === "view") return;
    setActions((prev) => prev.filter((a) => a.actionCode !== actionCode));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    const cleanId = appId.trim().toLowerCase();
    const rawRoute = route.trim();
    const cleanRoute = isExternalUrl
      ? rawRoute
      : rawRoute.startsWith("/")
        ? rawRoute
        : `/${rawRoute}`;

    if (isExternalUrl && !/^https?:\/\/[^\s]+$/i.test(cleanRoute)) {
      setErrorMsg(
        "Ingresa una URL externa válida que comience con https:// o http://.",
      );
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanId)) {
      setErrorMsg(
        "El ID de la herramienta debe usar minúsculas y guiones (ej. auditoria-facturas).",
      );
      return;
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing && initialApp && cleanId !== initialApp.id && !canEditId) {
      setErrorMsg(
        "Solo un super-admin puede cambiar el ID de una herramienta.",
      );
      return;
    }

    setSaving(true);
    try {
      if (isEditing && initialApp && cleanId !== initialApp.id && onRenameId) {
        await onRenameId(initialApp.id, cleanId);
      }
      await onSave({
        id: cleanId,
        name: name.trim(),
        description: description.trim(),
        route: cleanRoute,
        icon,
        tags,
        status,
        displayOrder: Number(displayOrder) || 100,
        actions,
      });
      onClose();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la herramienta.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-register-app-title"
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
              id="modal-register-app-title"
              className="text-lg font-bold text-[var(--text-body)]"
            >
              {isEditing
                ? `Editar herramienta: ${initialApp?.name}`
                : "Registrar nueva herramienta en el portal"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Configura la tarjeta que aparecerá en el portal, su ruta y sus
              permisos disponibles.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de herramienta"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Nombre de la herramienta (título en el portal)
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Validador de Tarifas"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>

            <label className="block" htmlFor="admin-app-id">
              <span className="text-xs font-bold text-[var(--text-body)]">
                ID único (appId)
              </span>
              <input
                id="admin-app-id"
                type="text"
                required
                disabled={isEditing && !canEditId}
                value={appId}
                onChange={(e) => {
                  setAutoSlug(false);
                  setAppId(e.target.value);
                }}
                placeholder="validador-tarifas"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-sm text-[var(--text-body)] disabled:opacity-60"
              />
              {isEditing && canEditId && (
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  Cambiar el ID mueve permisos y rutas fijas. Para Documentación
                  de APIs el id debe ser docs.
                </span>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-body)]">
                  Destino al abrir la herramienta
                </span>
                <div className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExternalUrl(false);
                      if (/^https?:\/\//i.test(route)) {
                        setRoute(appId ? `/${appId}` : "/");
                      }
                    }}
                    className={`rounded-[var(--radius-pill)] px-2 py-0.5 font-bold cursor-pointer ${
                      !isExternalUrl
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    Ruta interna
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExternalUrl(true);
                      if (!/^https?:\/\//i.test(route)) {
                        setRoute("https://");
                      }
                    }}
                    className={`rounded-[var(--radius-pill)] px-2 py-0.5 font-bold cursor-pointer ${
                      isExternalUrl
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    URL externa
                  </button>
                </div>
              </div>
              <input
                type="text"
                required
                aria-label="Ruta o URL de la herramienta"
                value={route}
                onChange={(e) => {
                  setAutoSlug(false);
                  setRoute(e.target.value);
                }}
                placeholder={
                  isExternalUrl
                    ? "https://mi-herramienta.coordinadora.com"
                    : "/validador-tarifas"
                }
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-sm text-[var(--text-body)]"
              />
            </div>

            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Icono de tarjeta
              </span>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value as AppIconType)}
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              >
                <option value="diagnostico">Checklist / Diagnóstico</option>
                <option value="pubsub">
                  Servidores / Registros / Mensajería
                </option>
                <option value="auditoria">Documento / Auditoría</option>
                <option value="docs">Catálogo / API Docs</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Estado inicial
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppStatus)}
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              >
                <option value="active">Activa (disponible)</option>
                <option value="maintenance">
                  En mantenimiento (solo administrador)
                </option>
                <option value="disabled">En construcción</option>
                <option value="hidden">Oculta del portal</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-[var(--text-body)]">
              Descripción para la tarjeta del portal
            </span>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica brevemente qué resuelve esta herramienta para operación..."
              className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Etiquetas (Tags separados por coma)
              </span>
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="Monitoreo, Soporte, Operaciones"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Orden en el portal
              </span>
              <input
                type="number"
                min={1}
                max={999}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>
          </div>

          <div className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/50 p-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-body)]">
                Permisos de la herramienta y qué roles los incluyen por defecto
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                El permiso <code>view</code> controla quién puede abrir la
                herramienta completa. También puedes agregar botones o funciones
                internas (ej. <code>exportar</code>, <code>remigrate</code>).
              </p>
            </div>

            <div className="space-y-2.5">
              {actions.map((act) => (
                <div
                  key={act.actionCode}
                  className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-body)]">
                        {act.actionCode === "view"
                          ? "🔑 Acceso general a la herramienta"
                          : `⚙️ Función interna: ${act.name}`}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-[var(--color-primary)]">
                        ({act.actionCode})
                      </span>
                    </div>

                    {act.actionCode !== "view" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAction(act.actionCode)}
                        className="text-xs font-semibold text-[var(--state-error)] hover:underline cursor-pointer"
                      >
                        Quitar acción
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      Roles que la traen activa por defecto:
                    </span>
                    {roles.map((r) => {
                      const checked =
                        r.id === "admin" || act.defaultRoles.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-0.5 text-[11px] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            disabled={r.id === "admin"}
                            checked={checked}
                            onChange={() =>
                              handleToggleRoleOnAction(act.actionCode, r.id)
                            }
                            className="size-3.5 rounded-[2px] text-[var(--color-primary)]"
                          />
                          <span className="font-semibold text-[var(--text-body)]">
                            {r.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-3 sm:flex-row">
              <input
                type="text"
                value={newActionName}
                onChange={(e) => setNewActionName(e.target.value)}
                placeholder="Nombre de función (ej. Exportar CSV)"
                className="flex-1 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-xs text-[var(--text-body)]"
              />
              <input
                type="text"
                value={newActionCode}
                onChange={(e) => setNewActionCode(e.target.value)}
                placeholder="Código (ej. export_csv)"
                className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 font-mono text-xs text-[var(--text-body)] sm:w-44"
              />
              <button
                type="button"
                onClick={handleAddAction}
                className="rounded-[var(--radius-pill)] border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-on)] cursor-pointer"
              >
                + Añadir función interna
              </button>
            </div>
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
              className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[var(--color-action-hover)] disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Guardando..." : "Guardar herramienta"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};
