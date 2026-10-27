import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  DocsApiError,
  fetchAdminClients,
  fetchApiDetail,
  updateAdminApi,
} from "../api/docs-api";
import type { DocsClient } from "../api/types";

type EditApiFormProps = {
  readonly apiId: string;
  readonly onUpdated?: (name: string, description?: string) => void;
};

export const EditApiForm = ({ apiId, onUpdated }: EditApiFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [clients, setClients] = useState<DocsClient[]>([]);
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
        <p className="mt-3 text-xs text-[var(--text-muted)]" aria-busy="true">
          Cargando datos…
        </p>
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
              Audiencias
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

              {clients.map((client) => {
                const aud = `client:${client.id}`;
                return (
                  <label
                    key={client.id}
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

              {extraClientAudiences.map((aud) => (
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
