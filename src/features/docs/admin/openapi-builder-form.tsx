import { useEffect, useState } from "react";
import {
  createEmptyBodyField,
  createEmptyDraft,
  createEmptyErrorResponse,
  createEmptyOperation,
  draftToEditorText,
  HTTP_METHODS,
  openApiToDraft,
  parseOpenApiJsonText,
  type DraftBodyField,
  type DraftHttpMethod,
  type DraftOperation,
  type DraftResponse,
  type OpenApiDraft,
} from "./openapi-draft";

type OpenApiBuilderFormProps = {
  /** Texto JSON actual al montar el Constructor (hidrata una vez). */
  readonly initialText: string;
  readonly onEditorChange: (text: string) => void;
};

const fieldClass =
  "mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

const labelClass = "block text-xs font-bold text-[var(--text-body)]";

const hydrateFromText = (
  text: string,
): { draft: OpenApiDraft; importError: string | null } => {
  const parsed = parseOpenApiJsonText(text);
  if (!parsed.ok) {
    if (!text.trim()) {
      return { draft: createEmptyDraft(), importError: null };
    }
    return {
      draft: createEmptyDraft(),
      importError: parsed.error,
    };
  }
  return { draft: openApiToDraft(parsed.value), importError: null };
};

/**
 * UI amigable para armar OpenAPI 3 (info, auth, endpoints) y materializar JSON.
 * Remontar el componente al entrar al modo Constructor para rehidratar.
 */
export const OpenApiBuilderForm = ({
  initialText,
  onEditorChange,
}: OpenApiBuilderFormProps) => {
  const hydrated = hydrateFromText(initialText);
  const [draft, setDraft] = useState<OpenApiDraft>(hydrated.draft);
  const [importError, setImportError] = useState<string | null>(
    hydrated.importError,
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const first = hydrated.draft.operations[0];
    return first ? { [first.id]: true } : {};
  });

  useEffect(() => {
    if (!importError) {
      onEditorChange(draftToEditorText(draft));
    }
    // Materializa JSON inicial al montar el Constructor.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  const updateDraft = (next: OpenApiDraft) => {
    setDraft(next);
    setImportError(null);
    onEditorChange(draftToEditorText(next));
  };

  const patchRoot = <K extends keyof OpenApiDraft>(
    key: K,
    value: OpenApiDraft[K],
  ) => {
    updateDraft({ ...draft, [key]: value });
  };

  const updateOperation = (
    opId: string,
    updater: (op: DraftOperation) => DraftOperation,
  ) => {
    updateDraft({
      ...draft,
      operations: draft.operations.map((op) =>
        op.id === opId ? updater(op) : op,
      ),
    });
  };

  const handleAddOperation = () => {
    const op = createEmptyOperation();
    setExpanded((prev) => ({ ...prev, [op.id]: true }));
    updateDraft({
      ...draft,
      operations: [...draft.operations, op],
    });
  };

  const handleRemoveOperation = (opId: string) => {
    updateDraft({
      ...draft,
      operations: draft.operations.filter((op) => op.id !== opId),
    });
  };

  return (
    <div className="mt-3 space-y-4" aria-label="Constructor OpenAPI">
      {importError ? (
        <p
          className="rounded-[var(--radius-1)] bg-[var(--alert-error-bg)] px-3 py-2 text-xs text-[var(--state-error)]"
          role="alert"
        >
          {importError} Puedes empezar desde cero con el Constructor; al guardar
          se generará JSON válido.
        </p>
      ) : null}

      {draft.advancedWarning ? (
        <p
          className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-app)] px-3 py-2 text-xs text-[var(--text-muted)]"
          role="status"
        >
          Esta especificación tiene estructura avanzada (schemas anidados o
          $ref). El Constructor muestra solo el primer nivel; usa el Editor para
          el resto.
        </p>
      ) : null}

      <fieldset className="space-y-3 rounded-[var(--radius-2)] border border-[var(--border-default)] p-3">
        <legend className="px-1 text-sm font-semibold text-[var(--text-body)]">
          Datos generales
        </legend>

        <label className={labelClass}>
          Título
          <input
            type="text"
            value={draft.title}
            onChange={(e) => patchRoot("title", e.target.value)}
            className={fieldClass}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Versión
            <input
              type="text"
              value={draft.version}
              onChange={(e) => patchRoot("version", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            URL base
            <input
              type="url"
              value={draft.serverUrl}
              onChange={(e) => patchRoot("serverUrl", e.target.value)}
              placeholder="https://api.ejemplo.com"
              className={fieldClass}
            />
          </label>
        </div>

        <label className={labelClass}>
          Descripción
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => patchRoot("description", e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--text-body)]">
          <input
            type="checkbox"
            checked={draft.bearerAuth}
            onChange={(e) => patchRoot("bearerAuth", e.target.checked)}
            className="h-4 w-4 rounded-[var(--radius-1)] border-[var(--border-default)]"
          />
          <span>Autenticación Bearer (JWT)</span>
        </label>
      </fieldset>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-body)]">
            Endpoints
          </h3>
          <button
            type="button"
            onClick={handleAddOperation}
            className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-app)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
          >
            Añadir endpoint
          </button>
        </div>

        {draft.operations.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            Aún no hay endpoints. Añade uno para documentar un método y path.
          </p>
        ) : null}

        {draft.operations.map((op) => {
          const isOpen = expanded[op.id] ?? false;
          return (
            <article
              key={op.id}
              className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-app)]"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-default)] p-3">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [op.id]: !isOpen }))
                  }
                  className="text-left text-sm font-semibold text-[var(--text-body)]"
                >
                  <span className="font-mono uppercase text-[var(--color-primary)]">
                    {op.method}
                  </span>{" "}
                  <span className="font-mono text-[var(--text-muted)]">
                    {op.path || "/"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveOperation(op.id)}
                  className="ml-auto text-xs font-semibold text-[var(--state-error)]"
                >
                  Eliminar
                </button>
              </div>

              {isOpen ? (
                <div className="space-y-3 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>
                      Método
                      <select
                        value={op.method}
                        onChange={(e) =>
                          updateOperation(op.id, (current) => ({
                            ...current,
                            method: e.target.value as DraftHttpMethod,
                          }))
                        }
                        className={fieldClass}
                      >
                        {HTTP_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Path
                      <input
                        type="text"
                        value={op.path}
                        onChange={(e) =>
                          updateOperation(op.id, (current) => ({
                            ...current,
                            path: e.target.value,
                          }))
                        }
                        className={fieldClass}
                      />
                    </label>
                  </div>

                  <label className={labelClass}>
                    Resumen
                    <input
                      type="text"
                      value={op.summary}
                      onChange={(e) =>
                        updateOperation(op.id, (current) => ({
                          ...current,
                          summary: e.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Descripción
                    <textarea
                      rows={2}
                      value={op.description}
                      onChange={(e) =>
                        updateOperation(op.id, (current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>

                  <BodyFieldsEditor
                    fields={op.bodyFields}
                    onChange={(bodyFields) =>
                      updateOperation(op.id, (current) => ({
                        ...current,
                        bodyFields,
                      }))
                    }
                  />

                  <ResponseEditor
                    label="Respuesta exitosa"
                    response={op.success}
                    onChange={(success) =>
                      updateOperation(op.id, (current) => ({
                        ...current,
                        success,
                      }))
                    }
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[var(--text-body)]">
                        Errores
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          updateOperation(op.id, (current) => ({
                            ...current,
                            errors: [
                              ...current.errors,
                              createEmptyErrorResponse(),
                            ],
                          }))
                        }
                        className="text-xs font-semibold text-[var(--color-primary)]"
                      >
                        Añadir error
                      </button>
                    </div>
                    {op.errors.map((error) => (
                      <div
                        key={error.id}
                        className="rounded-[var(--radius-1)] border border-[var(--border-default)] p-2"
                      >
                        <ResponseEditor
                          label={`Error ${error.status}`}
                          response={error}
                          onChange={(next) =>
                            updateOperation(op.id, (current) => ({
                              ...current,
                              errors: current.errors.map((item) =>
                                item.id === error.id ? next : item,
                              ),
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateOperation(op.id, (current) => ({
                              ...current,
                              errors: current.errors.filter(
                                (item) => item.id !== error.id,
                              ),
                            }))
                          }
                          className="mt-1 text-xs text-[var(--state-error)]"
                        >
                          Quitar error
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
};

type BodyFieldsEditorProps = {
  readonly fields: readonly DraftBodyField[];
  readonly onChange: (fields: readonly DraftBodyField[]) => void;
};

const BodyFieldsEditor = ({ fields, onChange }: BodyFieldsEditorProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold text-[var(--text-body)]">
        Campos del body (JSON)
      </p>
      <button
        type="button"
        onClick={() => onChange([...fields, createEmptyBodyField()])}
        className="text-xs font-semibold text-[var(--color-primary)]"
      >
        Añadir campo
      </button>
    </div>
    {fields.length === 0 ? (
      <p className="text-xs text-[var(--text-muted)]">Sin campos de body.</p>
    ) : null}
    {fields.map((field) => (
      <div
        key={field.id}
        className="grid gap-2 rounded-[var(--radius-1)] border border-[var(--border-default)] p-2 sm:grid-cols-2"
      >
        <label className={labelClass}>
          Nombre
          <input
            type="text"
            value={field.name}
            onChange={(e) =>
              onChange(
                fields.map((item) =>
                  item.id === field.id
                    ? { ...item, name: e.target.value }
                    : item,
                ),
              )
            }
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Tipo
          <select
            value={field.type}
            onChange={(e) =>
              onChange(
                fields.map((item) =>
                  item.id === field.id
                    ? {
                        ...item,
                        type: e.target.value as DraftBodyField["type"],
                      }
                    : item,
                ),
              )
            }
            className={fieldClass}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="integer">integer</option>
            <option value="boolean">boolean</option>
            <option value="array">array</option>
            <option value="object">object</option>
          </select>
        </label>
        <label className={labelClass}>
          Descripción
          <input
            type="text"
            value={field.description}
            onChange={(e) =>
              onChange(
                fields.map((item) =>
                  item.id === field.id
                    ? { ...item, description: e.target.value }
                    : item,
                ),
              )
            }
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Ejemplo
          <input
            type="text"
            value={field.example}
            onChange={(e) =>
              onChange(
                fields.map((item) =>
                  item.id === field.id
                    ? { ...item, example: e.target.value }
                    : item,
                ),
              )
            }
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-body)] sm:col-span-2">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) =>
              onChange(
                fields.map((item) =>
                  item.id === field.id
                    ? { ...item, required: e.target.checked }
                    : item,
                ),
              )
            }
            className="h-4 w-4"
          />
          Obligatorio
          <button
            type="button"
            onClick={() =>
              onChange(fields.filter((item) => item.id !== field.id))
            }
            className="ml-auto text-[var(--state-error)]"
          >
            Quitar
          </button>
        </label>
      </div>
    ))}
  </div>
);

type ResponseEditorProps = {
  readonly label: string;
  readonly response: DraftResponse;
  readonly onChange: (response: DraftResponse) => void;
};

const ResponseEditor = ({
  label,
  response,
  onChange,
}: ResponseEditorProps) => (
  <fieldset className="space-y-2">
    <legend className="text-xs font-bold text-[var(--text-body)]">
      {label}
    </legend>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className={labelClass}>
        Status
        <input
          type="text"
          value={response.status}
          onChange={(e) => onChange({ ...response, status: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Descripción
        <input
          type="text"
          value={response.description}
          onChange={(e) =>
            onChange({ ...response, description: e.target.value })
          }
          className={fieldClass}
        />
      </label>
    </div>
    <label className={labelClass}>
      Ejemplo JSON
      <textarea
        rows={3}
        value={response.exampleJson}
        onChange={(e) =>
          onChange({ ...response, exampleJson: e.target.value })
        }
        spellCheck={false}
        className={`${fieldClass} font-mono text-xs`}
        placeholder='{ "ok": true }'
      />
    </label>
  </fieldset>
);
