import { useEffect, useState } from "react";
import { OpenApiViewer } from "../openapi-viewer";
import { parseOpenApiJsonText } from "./openapi-draft";

type OpenApiLivePreviewProps = {
  readonly editorText: string;
  readonly file: File | null;
  readonly mode: "file" | "editor" | "builder";
};

const DEBOUNCE_MS = 300;

/**
 * Vista previa del documento de integración a partir del draft actual.
 */
export const OpenApiLivePreview = ({
  editorText,
  file,
  mode,
}: OpenApiLivePreviewProps) => {
  const [sourceText, setSourceText] = useState(editorText);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "file") {
      if (!file) {
        setSourceText("");
        setFileError(null);
        return;
      }
      let cancelled = false;
      const reader = new FileReader();
      reader.onload = () => {
        if (cancelled) return;
        const text = typeof reader.result === "string" ? reader.result : "";
        setSourceText(text);
        setFileError(null);
      };
      reader.onerror = () => {
        if (cancelled) return;
        setSourceText("");
        setFileError("No fue posible leer el archivo para la vista previa.");
      };
      reader.readAsText(file);
      return () => {
        cancelled = true;
        reader.abort();
      };
    }

    const timer = globalThis.setTimeout(() => {
      setSourceText(editorText);
      setFileError(null);
    }, DEBOUNCE_MS);
    return () => globalThis.clearTimeout(timer);
  }, [editorText, file, mode]);

  const parsed = parseOpenApiJsonText(sourceText);

  return (
    <section
      className="mt-6 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4"
      aria-labelledby="openapi-live-preview-title"
    >
      <h2
        id="openapi-live-preview-title"
        className="text-sm font-bold text-[var(--text-body)]"
      >
        Vista previa
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Así se verá la documentación de integración. Requiere JSON OpenAPI
        válido.
      </p>

      {fileError ? (
        <p className="mt-3 text-sm text-[var(--state-error)]" role="alert">
          {fileError}
        </p>
      ) : null}

      {!fileError && !parsed.ok ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">
          {parsed.error}
        </p>
      ) : null}

      {!fileError && parsed.ok ? (
        <div className="mt-4 max-h-[32rem] overflow-auto rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-app)] p-4">
          <OpenApiViewer document={parsed.value} />
        </div>
      ) : null}
    </section>
  );
};
