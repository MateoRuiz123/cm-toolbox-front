import { useEffect, useState } from "react";
import { DocsApiError, fetchOpenApi, publishSpec } from "../api/docs-api";
import { OpenApiSourceInput } from "./openapi-source-input";
import {
  resolveOpenApiFile,
  validateOpenApiSource,
  type OpenApiSourceMode,
} from "./openapi-source";
import { Skeleton, SkeletonRegion } from "@/shared/ui/skeleton";

type PublishSpecFormProps = {
  readonly apiId: string;
  readonly onPublished: (version: string) => void;
};

export const PublishSpecForm = ({
  apiId,
  onPublished,
}: PublishSpecFormProps) => {
  const [sourceMode, setSourceMode] = useState<OpenApiSourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [editorText, setEditorText] = useState("");
  const [editorHydrated, setEditorHydrated] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editorHydrated) return;
    let active = true;
    setLoadingEditor(true);
    fetchOpenApi(apiId)
      .then((doc) => {
        if (!active) return;
        setEditorText(JSON.stringify(doc, null, 2));
        setEditorHydrated(true);
      })
      .catch(() => {
        if (active) {
          setEditorHydrated(true);
          setError(
            "No fue posible cargar la especificación actual para editarla.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingEditor(false);
      });
    return () => {
      active = false;
    };
  }, [apiId, editorHydrated]);

  const handleSubmit = async () => {
    const sourceError = validateOpenApiSource(file, editorText, sourceMode);
    if (sourceError) {
      setError(sourceError);
      return;
    }
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const openApiFile = resolveOpenApiFile(sourceMode, file, editorText);
      const result = await publishSpec(apiId, openApiFile);
      setMessage("Especificación actualizada correctamente.");
      onPublished(result.version);
      setFile(null);
    } catch (e) {
      setError(
        e instanceof DocsApiError
          ? e.message
          : "La especificación no es OpenAPI válida.",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section
      className="mt-8 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4"
      aria-labelledby="publish-spec-title"
    >
      <h2
        id="publish-spec-title"
        className="text-sm font-bold text-[var(--text-body)]"
      >
        Actualizar especificación
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Sube un archivo, edita el OpenAPI o usa el Constructor visual.
      </p>

      {loadingEditor ? (
        <SkeletonRegion
          label="Cargando especificación actual…"
          className="mt-3 space-y-3"
        >
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-48 w-full rounded-[var(--radius-2)]" />
        </SkeletonRegion>
      ) : (
        <div className="mt-3">
          <OpenApiSourceInput
            mode={sourceMode}
            onModeChange={setSourceMode}
            file={file}
            onFileChange={setFile}
            editorText={editorText}
            onEditorChange={setEditorText}
            inputId="publish-spec-file"
            label="Especificación"
          />
        </div>
      )}

      <div className="mt-3">
        <button
          type="button"
          disabled={publishing || loadingEditor}
          onClick={() => void handleSubmit()}
          className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] disabled:opacity-50"
        >
          {publishing ? "Publicando…" : "Publicar"}
        </button>
      </div>

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
