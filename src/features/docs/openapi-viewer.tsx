import { useState } from "react";
import {
  buildOpenApiDocument,
  curlWithToken,
  type FieldSection,
  type HeaderRow,
  type OperationView,
} from "./openapi-document";

type OpenApiViewerProps = {
  readonly document: unknown;
};

const CopyButton = ({
  text,
  label,
}: {
  readonly text: string;
  readonly label: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1 text-[11px] font-bold text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
    >
      {copied ? "Copiado" : label}
    </button>
  );
};

const CodeBlock = ({
  text,
  label,
}: {
  readonly text: string;
  readonly label: string;
}) => (
  <div className="overflow-hidden rounded-[var(--radius-2)] border border-[var(--code-border)]">
    <div className="flex items-center justify-end border-b border-[var(--code-border)] bg-[var(--surface-bar)] px-3 py-2">
      <CopyButton text={text} label={label} />
    </div>
    <pre className="overflow-x-auto bg-[var(--code-bg)] p-4 font-mono text-xs leading-relaxed text-[var(--code-fg)]">
      {text}
    </pre>
  </div>
);

const YesNo = ({ value }: { readonly value: boolean }) => (
  <span>{value ? "Sí" : "No"}</span>
);

const HeaderTable = ({ rows }: { readonly rows: readonly HeaderRow[] }) => {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-[var(--text-body)]">
        Headers requeridos
      </h4>
      <div className="overflow-x-auto rounded-[var(--radius-2)] border border-[var(--border-default)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead className="bg-[var(--surface-sunken)] text-[11px] font-bold text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Header</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Requerido</th>
              <th className="px-3 py-2">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)] bg-[var(--surface-card)]">
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="px-3 py-2 font-mono text-[var(--text-body)]">
                  {row.name}
                </td>
                <td className="px-3 py-2 text-[var(--text-muted)]">
                  {row.type}
                </td>
                <td className="px-3 py-2 text-[var(--text-body)]">
                  <YesNo value={row.required} />
                </td>
                <td className="px-3 py-2 text-[var(--text-muted)]">
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FieldTables = ({
  sections,
}: {
  readonly sections: readonly FieldSection[];
}) => (
  <>
    {sections.map((section) => (
      <div key={section.title} className="space-y-2">
        <h4 className="text-sm font-bold text-[var(--text-body)]">
          {section.title}
        </h4>
        <div className="overflow-x-auto rounded-[var(--radius-2)] border border-[var(--border-default)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="bg-[var(--surface-sunken)] text-[11px] font-bold text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2">Campo</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Obligatorio</th>
                <th className="px-3 py-2">Validaciones</th>
                <th className="px-3 py-2">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)] bg-[var(--surface-card)]">
              {section.rows.map((row) => (
                <tr key={`${section.title}-${row.name}`}>
                  <td className="px-3 py-2 font-mono text-[var(--text-body)]">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {row.type}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-body)]">
                    <YesNo value={row.required} />
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {row.validations}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}
  </>
);

const OperationSection = ({
  operation,
  token,
}: {
  readonly operation: OperationView;
  readonly token: string;
}) => (
  <section
    id={operation.id}
    className="scroll-mt-24 space-y-4 border-t border-[var(--border-default)] pt-8"
  >
    <header>
      <p className="font-mono text-xs font-bold uppercase text-[var(--color-primary)]">
        {operation.method}
      </p>
      <h3 className="mt-1 font-mono text-lg font-bold text-[var(--text-body)]">
        {operation.path}
      </h3>
      <p className="mt-2 text-sm font-semibold text-[var(--text-body)]">
        {operation.summary}
      </p>
      {operation.description ? (
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
          {operation.description}
        </p>
      ) : null}
    </header>
    <HeaderTable rows={operation.headers} />
    {operation.bodyExample ? (
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-[var(--text-body)]">
          Cuerpo de la solicitud
        </h4>
        <CodeBlock text={operation.bodyExample} label="Copiar JSON" />
      </div>
    ) : null}
    <FieldTables sections={operation.bodySections} />
    {operation.successExample ? (
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-[var(--text-body)]">
          Respuesta exitosa ({operation.successStatus})
        </h4>
        <CodeBlock text={operation.successExample} label="Copiar JSON" />
      </div>
    ) : null}
    <FieldTables sections={operation.successSections} />
    {operation.errors.length > 0 ? (
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-[var(--text-body)]">
          Errores posibles
        </h4>
        {operation.errors.map((error) => (
          <div key={error.status} className="space-y-2">
            <p className="text-sm text-[var(--text-body)]">
              Status {error.status}
              {error.description ? ` — ${error.description}` : ""}
            </p>
            {error.json ? (
              <CodeBlock text={error.json} label="Copiar JSON" />
            ) : null}
          </div>
        ))}
      </div>
    ) : null}
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-[var(--text-body)]">
        Ejemplo cURL
      </h4>
      <CodeBlock
        text={
          operation.usesBearer
            ? curlWithToken(operation.curl, token)
            : operation.curl
        }
        label="Copiar cURL"
      />
    </div>
  </section>
);

/**
 * Documento de integración generado desde OpenAPI: índice, autenticación, tablas y cURL.
 */
export const OpenApiViewer = ({ document }: OpenApiViewerProps) => {
  const doc = buildOpenApiDocument(document);
  const [token, setToken] = useState("");

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav
        aria-label="Contenido de la especificación"
        className="mb-6 flex gap-2 overflow-x-auto lg:sticky lg:top-20 lg:mb-0 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
      >
        {doc.auth ? (
          <a
            href="#autenticacion"
            className="shrink-0 rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] hover:bg-[var(--surface-sunken)] lg:block"
          >
            Autenticación
          </a>
        ) : null}
        {doc.operations.map((operation) => (
          <a
            key={operation.id}
            href={`#${operation.id}`}
            className="shrink-0 rounded-[var(--radius-pill)] px-3 py-1.5 font-mono text-xs text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-body)] lg:block"
          >
            {operation.method} {operation.path}
          </a>
        ))}
      </nav>

      <article className="min-w-0 space-y-8">
        <header className="space-y-3 border-b border-[var(--border-default)] pb-6">
          <h2 className="text-2xl font-bold text-[var(--text-body)]">
            {doc.title}
          </h2>
          {doc.version ? (
            <p className="font-mono text-xs text-[var(--text-muted)]">
              v{doc.version}
            </p>
          ) : null}
          {doc.description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
              {doc.description}
            </p>
          ) : null}
          {doc.serverUrl ? (
            <p className="text-sm text-[var(--text-body)]">
              <span className="font-bold">URL base. </span>
              <span className="font-mono text-[var(--color-primary)]">
                {doc.serverUrl}
              </span>
            </p>
          ) : null}
        </header>

        {doc.auth ? (
          <section id="autenticacion" className="scroll-mt-24 space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-body)]">
              Autenticación
            </h3>
            <p className="max-w-3xl text-sm text-[var(--text-muted)]">
              {doc.auth.description}
            </p>
            {doc.auth.curl ? (
              <CodeBlock text={doc.auth.curl} label="Copiar cURL" />
            ) : null}
            {doc.auth.bearerHint ? (
              <div className="space-y-2">
                <p className="font-mono text-xs text-[var(--text-body)]">
                  {doc.auth.bearerHint}
                </p>
                <label className="block max-w-xl text-xs font-bold text-[var(--text-body)]">
                  Token de acceso
                  <input
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="Pega el access_token para armar el cURL"
                    className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm font-normal text-[var(--text-body)]"
                  />
                </label>
                <p className="text-xs text-[var(--text-muted)]">
                  El token solo vive en esta pantalla. Copia el cURL y ejecútalo
                  en tu terminal.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {doc.operations.map((operation) => (
          <OperationSection
            key={operation.id}
            operation={operation}
            token={token}
          />
        ))}
      </article>
    </div>
  );
};
