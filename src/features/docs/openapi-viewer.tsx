import { useEffect, useMemo, useState } from "react";
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

const METHOD_STYLES: Readonly<Record<string, string>> = {
  GET: "bg-[color-mix(in_srgb,var(--state-success)_16%,transparent)] text-[var(--state-success)]",
  POST: "bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[var(--color-primary)]",
  PUT: "bg-[color-mix(in_srgb,var(--state-warning)_16%,transparent)] text-[var(--state-warning)]",
  PATCH:
    "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[var(--color-accent)]",
  DELETE:
    "bg-[color-mix(in_srgb,var(--state-error)_16%,transparent)] text-[var(--state-error)]",
};

const MethodBadge = ({
  method,
  small = false,
}: {
  readonly method: string;
  readonly small?: boolean;
}) => {
  const key = method.toUpperCase();
  const tone =
    METHOD_STYLES[key] ??
    "bg-[var(--surface-sunken)] text-[var(--text-muted)]";
  return (
    <span
      className={`inline-block shrink-0 rounded-[var(--radius-1)] text-center font-mono font-bold uppercase tracking-wide ${tone} ${
        small ? "min-w-[3.25rem] px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {key}
    </span>
  );
};

const statusTone = (status: string): string => {
  if (status.startsWith("2")) {
    return "bg-[color-mix(in_srgb,var(--state-success)_16%,transparent)] text-[var(--state-success)]";
  }
  if (status.startsWith("5")) {
    return "bg-[color-mix(in_srgb,var(--state-error)_16%,transparent)] text-[var(--state-error)]";
  }
  return "bg-[color-mix(in_srgb,var(--state-warning)_18%,transparent)] text-[var(--state-warning)]";
};

const StatusChip = ({ status }: { readonly status: string }) => (
  <span
    className={`inline-block rounded-[var(--radius-pill)] px-2.5 py-0.5 font-mono text-xs font-bold ${statusTone(status)}`}
  >
    {status}
  </span>
);

const CodeBlock = ({
  text,
  label,
  lang = "json",
}: {
  readonly text: string;
  readonly label: string;
  readonly lang?: string;
}) => (
  <div className="overflow-hidden rounded-[var(--radius-3)] border border-[var(--code-border)] shadow-[var(--shadow-panel)]">
    <div className="flex items-center justify-between border-b border-[var(--code-border)] bg-[var(--surface-bar)] px-3 py-2">
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-[var(--state-error)] opacity-70" />
        <span className="size-2.5 rounded-full bg-[var(--state-warning)] opacity-70" />
        <span className="size-2.5 rounded-full bg-[var(--state-success)] opacity-70" />
        <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {lang}
        </span>
      </span>
      <CopyButton text={text} label={label} />
    </div>
    <pre className="overflow-x-auto bg-[var(--code-bg)] p-4 font-mono text-xs leading-relaxed text-[var(--code-fg)]">
      {text}
    </pre>
  </div>
);

const YesNo = ({ value }: { readonly value: boolean }) =>
  value ? (
    <span className="rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
      Sí
    </span>
  ) : (
    <span className="text-[var(--text-muted)]">No</span>
  );

const ParamTable = ({
  title,
  columnLabel,
  rows,
}: {
  readonly title: string;
  readonly columnLabel: string;
  readonly rows: readonly HeaderRow[];
}) => {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-[var(--text-body)]">{title}</h4>
      <div className="overflow-x-auto rounded-[var(--radius-2)] border border-[var(--border-default)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead className="bg-[var(--surface-sunken)] text-[11px] font-bold text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">{columnLabel}</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Requerido</th>
              <th className="px-3 py-2">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)] bg-[var(--surface-card)]">
            {rows.map((row) => (
              <tr key={`${columnLabel}-${row.name}`}>
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
    className="scroll-mt-24 space-y-5 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-panel)]"
  >
    <header>
      <div className="flex flex-wrap items-center gap-3">
        <MethodBadge method={operation.method} />
        <h3 className="min-w-0 break-all font-mono text-lg font-bold text-[var(--text-body)]">
          {operation.path}
        </h3>
        <span className="ml-auto">
          <CopyButton text={operation.path} label="Copiar ruta" />
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-[var(--text-body)]">
        {operation.summary}
      </p>
      {operation.description ? (
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
          {operation.description}
        </p>
      ) : null}
    </header>
    <ParamTable
      title="Parámetros de ruta"
      columnLabel="Parámetro"
      rows={operation.pathParams}
    />
    <ParamTable
      title="Parámetros de consulta"
      columnLabel="Parámetro"
      rows={operation.queryParams}
    />
    <ParamTable
      title="Headers requeridos"
      columnLabel="Header"
      rows={operation.headers}
    />
    {operation.bodyExample ? (
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-[var(--text-body)]">
          Cuerpo de la solicitud
        </h4>
        <CodeBlock text={operation.bodyExample} label="Copiar JSON" />
      </div>
    ) : null}
    <FieldTables sections={operation.bodySections} />
    {operation.successStatus ||
    operation.successExample ||
    operation.successSections.length > 0 ? (
      <div className="space-y-2">
        <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--text-body)]">
          <span>Respuesta exitosa</span>
          {operation.successStatus ? (
            <StatusChip status={operation.successStatus} />
          ) : null}
          {operation.successDescription ? (
            <span className="text-xs font-normal text-[var(--text-muted)]">
              — {operation.successDescription}
            </span>
          ) : null}
        </h4>
        {operation.successExample ? (
          <CodeBlock text={operation.successExample} label="Copiar JSON" />
        ) : null}
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
            <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-body)]">
              <StatusChip status={error.status} />
              {error.description}
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
        lang="bash"
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
  const doc = useMemo(() => buildOpenApiDocument(document), [document]);
  const [token, setToken] = useState("");
  const [endpointQuery, setEndpointQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filteredOperations = useMemo(() => {
    const q = endpointQuery.trim().toLowerCase();
    if (!q) return doc.operations;
    return doc.operations.filter(
      (op) =>
        op.path.toLowerCase().includes(q) ||
        op.method.toLowerCase().includes(q) ||
        op.summary.toLowerCase().includes(q),
    );
  }, [doc.operations, endpointQuery]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = [
      ...(doc.auth ? ["autenticacion"] : []),
      ...doc.operations.map((operation) => operation.id),
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    for (const id of ids) {
      const node = globalThis.document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [doc]);

  const navLink = (active: boolean) =>
    `flex shrink-0 items-center gap-2 rounded-[var(--radius-2)] px-3 py-2 text-xs transition lg:w-full ${
      active
        ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]"
        : "text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-body)]"
    }`;

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-10">
      <nav
        aria-label="Contenido de la especificación"
        className="mb-6 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-2 shadow-[var(--shadow-panel)] lg:sticky lg:top-20 lg:mb-0 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
      >
        {doc.operations.length > 1 ? (
          <div className="mb-2 border-b border-[var(--border-default)] pb-2">
            <input
              type="search"
              value={endpointQuery}
              onChange={(event) => setEndpointQuery(event.target.value)}
              placeholder="Filtrar endpoints..."
              aria-label="Filtrar endpoints"
              className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            />
          </div>
        ) : null}
        <div className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">
          {doc.auth ? (
            <a
              href="#autenticacion"
              aria-current={activeId === "autenticacion" ? "location" : undefined}
              className={navLink(activeId === "autenticacion")}
            >
              Autenticación
            </a>
          ) : null}
          {filteredOperations.map((operation) => (
            <a
              key={operation.id}
              href={`#${operation.id}`}
              title={`${operation.method} ${operation.path} — ${operation.summary}`}
              aria-current={activeId === operation.id ? "location" : undefined}
              className={navLink(activeId === operation.id)}
            >
              <MethodBadge method={operation.method} small />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono">
                  {operation.path}
                </span>
                {operation.summary &&
                operation.summary !== `${operation.method} ${operation.path}` ? (
                  <span className="hidden truncate text-[11px] font-normal text-[var(--text-muted)] lg:block">
                    {operation.summary}
                  </span>
                ) : null}
              </span>
            </a>
          ))}
          {filteredOperations.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
              Sin coincidencias
            </p>
          ) : null}
        </div>
      </nav>

      <article className="min-w-0 space-y-8">
        <header className="space-y-3 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--surface-card)] p-6 shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-body)]">
              {doc.title}
            </h2>
            {doc.version ? (
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--color-primary-contrast)]">
                v{doc.version}
              </span>
            ) : null}
          </div>
          {doc.description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
              {doc.description}
            </p>
          ) : null}
          {doc.serverUrl ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-body)]">
              <span className="font-bold">URL base</span>
              <span className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-1 font-mono text-xs text-[var(--color-primary)]">
                {doc.serverUrl}
              </span>
              <CopyButton text={doc.serverUrl} label="Copiar URL" />
            </div>
          ) : null}
        </header>

        {doc.auth ? (
          <section
            id="autenticacion"
            className="scroll-mt-24 space-y-4 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-panel)]"
          >
            <h3 className="text-lg font-bold text-[var(--text-body)]">
              Autenticación
            </h3>
            <p className="max-w-3xl text-sm text-[var(--text-muted)]">
              {doc.auth.description}
            </p>
            {doc.auth.curl ? (
              <CodeBlock lang="bash" text={doc.auth.curl} label="Copiar cURL" />
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
