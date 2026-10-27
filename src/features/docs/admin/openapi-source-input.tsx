import { useState } from "react";
import { OpenApiBuilderForm } from "./openapi-builder-form";
import { OpenApiLivePreview } from "./openapi-live-preview";
import type { OpenApiSourceMode } from "./openapi-source";

type OpenApiSourceInputProps = {
  readonly mode: OpenApiSourceMode;
  readonly onModeChange: (mode: OpenApiSourceMode) => void;
  readonly file: File | null;
  readonly onFileChange: (file: File | null) => void;
  readonly editorText: string;
  readonly onEditorChange: (text: string) => void;
  readonly required?: boolean;
  readonly inputId?: string;
  readonly label?: string;
  readonly showPreview?: boolean;
};

const tabClass = (active: boolean): string =>
  `rounded-[var(--radius-pill)] px-3 py-1 text-xs font-semibold transition ${
    active
      ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
      : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
  }`;

/**
 * Origen de la especificación: archivo, editor o constructor UI + preview.
 */
export const OpenApiSourceInput = ({
  mode,
  onModeChange,
  file,
  onFileChange,
  editorText,
  onEditorChange,
  required = true,
  inputId = "openapi-source-file",
  label = "Especificación OpenAPI",
  showPreview = true,
}: OpenApiSourceInputProps) => {
  const [builderKey, setBuilderKey] = useState(0);

  const handleModeChange = (next: OpenApiSourceMode) => {
    if (next === "builder") {
      setBuilderKey((key) => key + 1);
    }
    onModeChange(next);
  };

  const handleFileChange = (next: File | null) => {
    onFileChange(next);
    if (!next) return;
    if (
      !next.name.endsWith(".json") &&
      next.type !== "application/json"
    ) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onEditorChange(reader.result);
      }
    };
    reader.readAsText(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text-body)]">
          {label}
          {required ? " *" : ""}
        </p>
        <div
          className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border-default)] p-0.5"
          role="group"
          aria-label="Origen de la especificación"
        >
          <button
            type="button"
            aria-pressed={mode === "file"}
            onClick={() => handleModeChange("file")}
            className={tabClass(mode === "file")}
          >
            Archivo
          </button>
          <button
            type="button"
            aria-pressed={mode === "editor"}
            onClick={() => handleModeChange("editor")}
            className={tabClass(mode === "editor")}
          >
            Editor
          </button>
          <button
            type="button"
            aria-pressed={mode === "builder"}
            onClick={() => handleModeChange("builder")}
            className={tabClass(mode === "builder")}
          >
            Constructor
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        YAML o JSON OpenAPI 3.x (máx. 2 MiB). Archivo, editor de código o
        constructor visual.
      </p>

      {mode === "file" ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-[var(--radius-pill)] border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-contrast)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--border-focus)]">
            <input
              id={inputId}
              type="file"
              accept=".yaml,.yml,.json,application/json,application/yaml,text/yaml"
              aria-label="Archivo OpenAPI"
              onChange={(e) =>
                handleFileChange(e.target.files?.[0] ?? null)
              }
              className="sr-only"
            />
            Seleccionar archivo
          </label>
          <span
            className="min-w-0 truncate text-sm text-[var(--text-body)]"
            aria-live="polite"
          >
            {file ? file.name : "Ningún archivo seleccionado"}
          </span>
        </div>
      ) : null}

      {mode === "editor" ? (
        <textarea
          id={`${inputId}-editor`}
          value={editorText}
          onChange={(e) => onEditorChange(e.target.value)}
          rows={16}
          spellCheck={false}
          aria-label="Editor OpenAPI"
          placeholder={
            '{\n  "openapi": "3.0.3",\n  "info": { "title": "…", "version": "1.0.0" },\n  "paths": {}\n}'
          }
          className="mt-2 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      ) : null}

      {mode === "builder" ? (
        <OpenApiBuilderForm
          key={builderKey}
          initialText={editorText}
          onEditorChange={onEditorChange}
        />
      ) : null}

      {showPreview ? (
        <OpenApiLivePreview
          mode={mode}
          file={file}
          editorText={editorText}
        />
      ) : null}
    </div>
  );
};

export type { OpenApiSourceMode };
