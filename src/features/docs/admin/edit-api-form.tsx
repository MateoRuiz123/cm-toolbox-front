import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  DocsApiError,
  fetchAdminClients,
  fetchApiDetail,
  updateAdminApi,
} from "../api/docs-api";
import type { DocsClient } from "../api/types";
import { Skeleton, SkeletonRegion } from "@/shared/ui/skeleton";

type EditApiFormProps = {
  readonly apiId: string;
  readonly onUpdated?: (name: string, description?: string) => void;
};

export const EditApiForm = ({ apiId, onUpdated }: EditApiFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [clients, setClients] = useState<DocsClient[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, clientList] = await Promise.all([
        fetchApiDetail(apiId),
        fetchAdminClients(),
      ]);
      setName(detail.name);
      setDescription(detail.description ?? "");
      setAudiences(detail.audiences ? [...detail.audiences] : ["internal"]);
      setClients(clientList);
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible cargar la documentación para editarla.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleAudience = (aud: string) => {
    setMessage(null);
    setError(null);
    setAudiences((prev) =>
      prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la API es obligatorio.");
      return;
    }
    if (audiences.length === 0) {
      setError("Selecciona al menos una audiencia.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateAdminApi(apiId, {
        name: name.trim(),
        description: description.trim(),
        audiences,
      });
      setName(updated.name);
      setDescription(updated.description ?? "");
      setAudiences(updated.audiences ? [...updated.audiences] : []);
      setMessage("Documentación actualizada correctamente.");
      onUpdated?.(updated.name, updated.description);
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  };

  const extraClientAudiences = audiences.filter(
    (a) =>
      a.startsWith("client:") &&
      !clients.some((c) => `client:${c.id}` === a),
  );

  const normalizedClientFilter = clientFilter.trim().toLowerCase();
  const filteredClients = normalizedClientFilter
    ? clients.filter(
        (client) =>
          client.name.toLowerCase().includes(normalizedClientFilter) ||
          client.id.toLowerCase().includes(normalizedClientFilter) ||
          client.email.toLowerCase().includes(normalizedClientFilter),
      )
    : clients;
  const filteredExtraAudiences = normalizedClientFilter
    ? extraClientAudiences.filter((aud) =>
        aud.toLowerCase().includes(normalizedClientFilter),
      )
    : extraClientAudiences;

  return (
    <section
      className="mt-8 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4"
      aria-labelledby="edit-api-form-title"
    >
      <h2
        id="edit-api-form-title"
        className="text-sm font-bold text-[var(--text-body)]"
      >
        Editar documentación
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Actualiza nombre, descripción y quién puede ver esta API. El
        identificador ({apiId}) no se puede cambiar.
      </p>

      {loading ? (
        <SkeletonRegion label="Cargando datos…" className="mt-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-[var(--radius-2)]" />
          <Skeleton className="h-20 w-full rounded-[var(--radius-2)]" />
          <Skeleton className="h-10 w-1/2 rounded-[var(--radius-2)]" />
        </SkeletonRegion>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-body)]">
              Nombre
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-body)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-[var(--text-body)]">
              Descripción
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-body)]"
            />
          </label>

          <fieldset>
            <legend className="text-xs font-bold text-[var(--text-body)]">
              Audiencias ({audiences.length} seleccionadas)
            </legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                <input
                  type="checkbox"
                  checked={audiences.includes("internal")}
                  onChange={() => toggleAudience("internal")}
                  className="h-4 w-4 rounded-[var(--radius-1)] border-[var(--border-default)]"
                />
                <span>Internos (internal)</span>
              </label>

              {clients.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]"
                    >
                      <circle cx="9" cy="9" r="5.5" />
                      <path
                        d="m13.5 13.5 3.5 3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <input
                      type="search"
                      value={clientFilter}
                      onChange={(e) => setClientFilter(e.target.value)}
                      placeholder="Buscar cliente por nombre, NIT o correo..."
                      aria-label="Filtrar clientes en audiencias"
                      className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-app)] py-1.5 pl-8 pr-8 text-xs text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [&::-webkit-search-cancel-button]:hidden"
                    />
                    {clientFilter ? (
                      <button
                        type="button"
                        onClick={() => setClientFilter("")}
                        aria-label="Limpiar búsqueda de clientes"
                        title="Limpiar búsqueda"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[var(--radius-1)] p-1 text-[var(--text-muted)] transition hover:text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          aria-hidden="true"
                          className="size-3.5"
                        >
                          <path
                            d="M4 4l8 8M12 4l-8 8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {filteredClients.length} de {clients.length}{" "}
                    {clients.length === 1 ? "cliente" : "clientes"}
                  </p>
                </div>
              ) : null}

              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {filteredClients.map((client) => {
                  const aud = `client:${client.id}`;
                  return (
                    <label
                      key={client.id}
                      title={client.email}
                      className="flex items-center gap-2 text-sm text-[var(--text-body)]"
                    >
                      <input
                        type="checkbox"
                        checked={audiences.includes(aud)}
                        onChange={() => toggleAudience(aud)}
                        className="h-4 w-4 rounded-[var(--radius-1)] border-[var(--border-default)]"
                      />
                      <span>
                        {client.name} ({aud})
                      </span>
                    </label>
                  );
                })}

                {filteredExtraAudiences.map((aud) => (
                  <label
                    key={aud}
                    className="flex items-center gap-2 text-sm text-[var(--text-body)]"
                  >
                    <input
                      type="checkbox"
                      checked={audiences.includes(aud)}
                      onChange={() => toggleAudience(aud)}
                      className="h-4 w-4 rounded-[var(--radius-1)] border-[var(--border-default)]"
                    />
                    <span>{aud}</span>
                  </label>
                ))}

                {normalizedClientFilter &&
                filteredClients.length === 0 &&
                filteredExtraAudiences.length === 0 ? (
                  <p className="rounded-[var(--radius-1)] border border-dashed border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-muted)]">
                    No se encontraron clientes para «{clientFilter.trim()}».
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-contrast)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}

      {message ? (
        <p className="mt-2 text-sm text-[var(--color-primary)]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-[var(--state-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};
