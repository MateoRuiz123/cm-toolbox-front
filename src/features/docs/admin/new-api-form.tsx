import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAccess } from "@/shared/auth/access-context";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import {
  createAdminApi,
  DocsApiError,
  fetchAdminClients,
} from "../api/docs-api";
import type { DocsClient } from "../api/types";
import { OpenApiSourceInput } from "./openapi-source-input";
import {
  resolveOpenApiFile,
  validateOpenApiSource,
  type OpenApiSourceMode,
} from "./openapi-source";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugifyApiId = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const NewApiForm = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [customId, setCustomId] = useState("");
  const [description, setDescription] = useState("");
  const [sourceMode, setSourceMode] = useState<OpenApiSourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [editorText, setEditorText] = useState("");
  const [audiences, setAudiences] = useState<string[]>(["internal"]);
  const [clients, setClients] = useState<DocsClient[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminClients()
      .then((list) => {
        if (active) setClients(list);
      })
      .catch(() => {
        if (active) setClients([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const derivedId = customId.trim() || slugifyApiId(name);

  const toggleAudience = (aud: string) => {
    setAudiences((prev) =>
      prev.includes(aud) ? prev.filter((item) => item !== aud) : [...prev, aud],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!derivedId || !SLUG_RE.test(derivedId)) {
      setError(
        "El identificador (slug) debe contener solo minúsculas, números y guiones.",
      );
      return;
    }
    const sourceError = validateOpenApiSource(file, editorText, sourceMode);
    if (sourceError) {
      setError(sourceError);
      return;
    }
    if (audiences.length === 0) {
      setError("Selecciona al menos una audiencia.");
      return;
    }

    setSubmitting(true);
    try {
      const openApiFile = resolveOpenApiFile(sourceMode, file, editorText);
      const created = await createAdminApi({
        id: derivedId,
        name: name.trim(),
        description: description.trim() || undefined,
        audiences,
        file: openApiFile,
      });
      navigate(`/docs/${created.id}`);
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible crear la documentación.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-6 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      <div>
        <label
          htmlFor="new-api-name"
          className="block text-sm font-semibold text-[var(--text-body)]"
        >
          Nombre *
        </label>
        <input
          id="new-api-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Generación de guías"
          className="mt-1.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </div>

      <div>
        <label
          htmlFor="new-api-id"
          className="block text-sm font-semibold text-[var(--text-body)]"
        >
          Id (slug)
        </label>
        <input
          id="new-api-id"
          type="text"
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          placeholder={slugifyApiId(name) || "ej. api-guias"}
          className="mt-1.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Si lo dejas vacío se derivará del nombre:{" "}
          <code className="font-mono text-[var(--text-body)]">
            {derivedId || "—"}
          </code>
        </p>
      </div>

      <div>
        <label
          htmlFor="new-api-description"
          className="block text-sm font-semibold text-[var(--text-body)]"
        >
          Descripción
        </label>
        <textarea
          id="new-api-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Resumen breve del contrato y casos de uso"
          className="mt-1.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </div>

      <OpenApiSourceInput
        mode={sourceMode}
        onModeChange={setSourceMode}
        file={file}
        onFileChange={setFile}
        editorText={editorText}
        onEditorChange={setEditorText}
        inputId="new-api-file"
      />

      <fieldset className="space-y-2 border-t border-[var(--border-default)] pt-4">
        <legend className="text-sm font-semibold text-[var(--text-body)]">
          Audiencias iniciales
        </legend>
        <p className="text-xs text-[var(--text-muted)]">
          Selecciona quién puede consultar esta documentación en el catálogo.
        </p>

        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-[var(--text-body)]">
            <input
              type="checkbox"
              checked={audiences.includes("internal")}
              onChange={() => toggleAudience("internal")}
              className="h-4 w-4 rounded-[var(--radius-1)] border-[var(--border-default)]"
            />
            <span>Solo internos (internal)</span>
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
        </div>
      </fieldset>

      {error ? (
        <p
          className="rounded-[var(--radius-1)] bg-[var(--alert-error-bg)] px-3 py-2 text-sm text-[var(--state-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-primary-contrast)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {submitting ? "Creando…" : "Crear documentación"}
        </button>
        <Link
          to="/docs"
          className="rounded-[var(--radius-pill)] border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
};

export const DocsNewApiPage = () => {
  const { isSuperAdmin, canPerformAction } = useAccess();
  const canManage = isSuperAdmin || canPerformAction("docs", "manage");

  if (!canManage) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-[var(--text-body)]" role="alert">
          No tienes permisos para crear documentación.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4 text-sm">
        <Link
          to="/docs"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Catálogo
        </Link>
        <span className="text-[var(--text-muted)]">/</span>
        <Link
          to="/docs/admin"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Administrar
        </Link>
      </div>

      <header className="mb-6">
        <SmoothTitleAccent
          as="h1"
          className="text-2xl font-bold text-[var(--text-body)]"
          accessibleTitle="Nueva documentación"
          before="Nueva "
          accent="documentación"
          amplitude={3}
        />
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Publica una especificación OpenAPI 3.x (archivo, editor o constructor)
          y define las audiencias que pueden consultarla.
        </p>
      </header>

      <NewApiForm />
    </div>
  );
};
