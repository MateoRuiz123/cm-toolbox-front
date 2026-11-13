import {
  buildOpenApiDocument,
  type FieldSection,
  type HeaderRow,
  type OpenApiDocumentView,
  type OperationView,
} from "./openapi-document";

const yesNo = (value: boolean): string => (value ? "✓" : "✗");

const paramMarkdownTable = (
  title: string,
  columnLabel: string,
  rows: readonly HeaderRow[],
): string[] => {
  if (rows.length === 0) return [];
  return [
    `#### ${title}`,
    "",
    `| ${columnLabel} | Tipo | Requerido | Descripción |`,
    "| --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| \`${row.name}\` | ${row.type} | ${yesNo(row.required)} | ${row.description || "—"} |`,
    ),
    "",
  ];
};

const fieldTable = (section: FieldSection): string => {
  const lines = [
    `**${section.title}**`,
    "",
    "| Campo | Tipo | Obligatorio | Validaciones | Descripción |",
    "| --- | --- | --- | --- | --- |",
    ...section.rows.map(
      (row) =>
        `| \`${row.name}\` | ${row.type} | ${yesNo(row.required)} | ${row.validations || "—"} | ${row.description || "—"} |`,
    ),
    "",
  ];
  return lines.join("\n");
};

const operationMarkdown = (operation: OperationView): string => {
  const parts: string[] = [`### ${operation.method} \`${operation.path}\``, ""];
  if (operation.summary) parts.push(operation.summary, "");
  if (operation.description) parts.push(operation.description, "");

  parts.push(
    ...paramMarkdownTable("Parámetros de ruta", "Parámetro", operation.pathParams),
    ...paramMarkdownTable(
      "Parámetros de consulta",
      "Parámetro",
      operation.queryParams,
    ),
    ...paramMarkdownTable("Headers requeridos", "Header", operation.headers),
  );

  if (operation.bodyExample) {
    parts.push(
      "#### Cuerpo de la solicitud",
      "",
      "```json",
      operation.bodyExample,
      "```",
      "",
    );
  }
  for (const section of operation.bodySections) {
    parts.push(fieldTable(section));
  }

  if (
    operation.successStatus ||
    operation.successExample ||
    operation.successSections.length > 0
  ) {
    const statusSuffix = operation.successStatus
      ? ` (${operation.successStatus})`
      : "";
    parts.push(`#### Respuesta exitosa${statusSuffix}`, "");
    if (operation.successDescription) {
      parts.push(operation.successDescription, "");
    }
    if (operation.successExample) {
      parts.push("```json", operation.successExample, "```", "");
    }
    for (const section of operation.successSections) {
      parts.push(fieldTable(section));
    }
  }

  if (operation.errors.length > 0) {
    parts.push("#### Errores posibles", "");
    for (const error of operation.errors) {
      parts.push(
        `- **${error.status}**${error.description ? ` — ${error.description}` : ""}`,
      );
      if (error.json) {
        parts.push("", "```json", error.json, "```");
      }
    }
    parts.push("");
  }

  parts.push(
    "#### Ejemplo cURL",
    "",
    "```bash",
    operation.curl,
    "```",
    "",
    "---",
    "",
  );
  return parts.join("\n");
};

const documentToMarkdown = (doc: OpenApiDocumentView): string => {
  const parts: string[] = [`# ${doc.title}`, ""];
  if (doc.version) parts.push(`Versión: \`${doc.version}\``, "");
  if (doc.description) {
    parts.push("## Descripción general", "", doc.description, "", "---", "");
  }
  if (doc.serverUrl) {
    parts.push("## URL base", "", `- \`${doc.serverUrl}\``, "", "---", "");
  }
  if (doc.auth) {
    parts.push("## Autenticación", "", doc.auth.description, "");
    if (doc.auth.curl) {
      parts.push("```bash", doc.auth.curl, "```", "");
    }
    if (doc.auth.bearerHint) {
      parts.push("```", doc.auth.bearerHint, "```", "");
    }
    parts.push("---", "");
  }
  parts.push("## Endpoints", "");
  for (const operation of doc.operations) {
    parts.push(operationMarkdown(operation));
  }
  return parts.join("\n").trimEnd() + "\n";
};

/** Genera Markdown de integración (mismo estilo que `api_documentacion.md`). */
export const openApiToMarkdown = (document: unknown): string =>
  documentToMarkdown(buildOpenApiDocument(document));

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const mdInline = (value: string): string =>
  escapeHtml(value).replaceAll(/`([^`]+)`/g, "<code>$1</code>");

const keep = (...parts: string[]): string =>
  `<div class="keep">${parts.join("\n")}</div>`;

const codeBox = (lang: string, code: string): string =>
  `<div class="code-box"><div class="code-bar">${escapeHtml(lang)}</div><pre><code>${escapeHtml(code)}</code></pre></div>`;

const htmlParamTable = (
  title: string,
  columnLabel: string,
  rows: readonly HeaderRow[],
): string | null => {
  if (rows.length === 0) return null;
  return keep(
    `<h4>${escapeHtml(title)}</h4>`,
    `<table><thead><tr><th>${escapeHtml(columnLabel)}</th><th>Tipo</th><th>Requerido</th><th>Descripción</th></tr></thead><tbody>`,
    ...rows.map(
      (row) =>
        `<tr><td><code>${escapeHtml(row.name)}</code></td><td>${escapeHtml(row.type)}</td><td><span class="yn yn-${row.required ? "yes" : "no"}">${yesNo(row.required)}</span></td><td>${mdInline(row.description || "—")}</td></tr>`,
    ),
    "</tbody></table>",
  );
};

const htmlFieldTables = (sections: readonly FieldSection[]): string[] =>
  sections.map((section) =>
    keep(
      `<h4>${escapeHtml(section.title)}</h4>`,
      "<table><thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Validaciones</th><th>Descripción</th></tr></thead><tbody>",
      ...section.rows.map(
        (r) =>
          `<tr><td><code>${escapeHtml(r.name)}</code></td><td>${escapeHtml(r.type)}</td><td><span class="yn yn-${r.required ? "yes" : "no"}">${yesNo(r.required)}</span></td><td>${escapeHtml(r.validations || "—")}</td><td>${mdInline(r.description || "—")}</td></tr>`,
      ),
      "</tbody></table>",
    ),
  );

const statusClass = (status: string): string => {
  if (status.startsWith("2")) return "status-2xx";
  if (status.startsWith("5")) return "status-5xx";
  return "status-4xx";
};

/** HTML imprimible corporativo con portada, índice y tarjetas por endpoint. */
export const openApiToPrintHtml = (document: unknown): string => {
  const doc = buildOpenApiDocument(document);
  const sections: string[] = [];

  const metaChips: string[] = [];
  if (doc.version) {
    metaChips.push(
      `<span class="meta-pill">Versión <strong>v${escapeHtml(doc.version)}</strong></span>`,
    );
  }
  metaChips.push(
    `<span class="meta-pill"><strong>${doc.operations.length}</strong> ${doc.operations.length === 1 ? "endpoint" : "endpoints"}</span>`,
  );
  if (doc.auth) {
    metaChips.push(`<span class="meta-pill">Auth: <strong>Bearer / OAuth</strong></span>`);
  }

  sections.push(`<header class="doc-hero">
    <p class="doc-eyebrow">COORDINADORA MERCANTIL · DOCUMENTACIÓN TÉCNICA DE INTEGRACIÓN</p>
    <h1>${escapeHtml(doc.title)}</h1>
    <div class="meta-row">${metaChips.join("")}</div>
  </header>`);

  if (doc.description) {
    sections.push(
      keep(
        "<h2>Descripción General</h2>",
        `<p class="lead">${escapeHtml(doc.description)}</p>`,
      ),
    );
  }
  if (doc.serverUrl) {
    sections.push(
      keep(
        "<h2>URL Base</h2>",
        `<div class="base-url-box"><span class="base-url-label">Ambiente</span><code>${escapeHtml(doc.serverUrl)}</code></div>`,
      ),
    );
  }
  if (doc.auth) {
    const authParts = [
      "<h2>Autenticación</h2>",
      `<p>${escapeHtml(doc.auth.description)}</p>`,
    ];
    if (doc.auth.bearerHint) {
      authParts.push(
        `<div class="note">Las operaciones protegidas exigen el header <code>Authorization</code> con el token de acceso.</div>`,
        codeBox("header", doc.auth.bearerHint),
      );
    }
    sections.push(keep(...authParts));
    if (doc.auth.curl) {
      sections.push(keep("<h4>Ejemplo cURL</h4>", codeBox("bash", doc.auth.curl)));
    }
  }

  if (doc.operations.length > 0) {
    sections.push(
      keep(
        "<h2>Índice de Endpoints</h2>",
        "<table><thead><tr><th>Método</th><th>Ruta</th><th>Resumen</th></tr></thead><tbody>",
        ...doc.operations.map(
          (op) =>
            `<tr><td><span class="method" data-method="${escapeHtml(op.method)}">${escapeHtml(op.method)}</span></td><td><code>${escapeHtml(op.path)}</code></td><td>${escapeHtml(op.summary || "—")}</td></tr>`,
        ),
        "</tbody></table>",
      ),
    );
  }

  sections.push('<h2 class="section-title">Endpoints</h2>');
  for (const [index, op] of doc.operations.entries()) {
    sections.push(`<section class="endpoint">`);
    const intro = [
      `<div class="endpoint-head"><h3><span class="method" data-method="${escapeHtml(op.method)}">${escapeHtml(op.method)}</span> <code class="endpoint-path">${escapeHtml(op.path)}</code></h3>`,
    ];
    if (op.summary && op.summary !== `${op.method} ${op.path}`) {
      intro.push(`<p class="endpoint-summary">${escapeHtml(op.summary)}</p>`);
    }
    if (op.description) {
      intro.push(`<p class="endpoint-desc">${escapeHtml(op.description)}</p>`);
    }
    intro.push("</div>");
    sections.push(keep(...intro));

    const pathTable = htmlParamTable(
      "Parámetros de Ruta",
      "Parámetro",
      op.pathParams,
    );
    if (pathTable) sections.push(pathTable);

    const queryTable = htmlParamTable(
      "Parámetros de Consulta",
      "Parámetro",
      op.queryParams,
    );
    if (queryTable) sections.push(queryTable);

    const headerTable = htmlParamTable("Headers Requeridos", "Header", op.headers);
    if (headerTable) sections.push(headerTable);

    if (op.bodyExample) {
      sections.push(
        keep("<h4>Cuerpo de la Solicitud</h4>", codeBox("json", op.bodyExample)),
      );
    }
    sections.push(...htmlFieldTables(op.bodySections));

    if (op.successStatus || op.successExample || op.successSections.length > 0) {
      const statusChip = op.successStatus
        ? ` <span class="status-chip status-2xx">${escapeHtml(op.successStatus)}</span>`
        : "";
      const successParts = [
        `<h4>Respuesta Exitosa (${escapeHtml(op.successStatus ?? "200")})${statusChip}</h4>`,
      ];
      if (op.successDescription) {
        successParts.push(`<p class="muted">${escapeHtml(op.successDescription)}</p>`);
      }
      if (op.successExample) {
        successParts.push(codeBox("json", op.successExample));
      }
      sections.push(keep(...successParts));
      sections.push(...htmlFieldTables(op.successSections));
    }

    if (op.errors.length > 0) {
      sections.push("<h4>Errores Posibles</h4>");
      for (const err of op.errors) {
        const errorParts = [
          `<p class="error-line"><span class="status-chip ${statusClass(err.status)}">${escapeHtml(err.status)}</span>${err.description ? ` ${escapeHtml(err.description)}` : ""}</p>`,
        ];
        if (err.json) {
          errorParts.push(codeBox("json", err.json));
        }
        sections.push(keep(...errorParts));
      }
    }

    sections.push(keep("<h4>Ejemplo cURL</h4>", codeBox("bash", op.curl)));
    sections.push("</section>");
    if (index < doc.operations.length - 1) {
      sections.push('<hr class="section-rule" />');
    }
  }

  const generatedDate = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  sections.push(
    `<footer class="doc-footer">
      <p>${doc.version ? `Versión de Documentación: <strong>${escapeHtml(doc.version)}</strong> · ` : ""}Generado el ${escapeHtml(generatedDate)}</p>
      <p>Coordinadora Mercantil S.A.</p>
    </footer>`,
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    /* @page sin márgenes: el navegador no pinta cabecera/pie ni numeración.
       El aire visual va en padding del body (mismos 18×16 mm). */
    @page {
      size: A4;
      margin: 0;
    }
    @page {
      @top-left { content: none; }
      @top-center { content: none; }
      @top-right { content: none; }
      @bottom-left { content: none; }
      @bottom-center { content: none; }
      @bottom-right { content: none; }
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      padding: 18mm 16mm;
      color: #1f2328;
      background: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
    }
    .doc-hero {
      padding: 16px 20px;
      margin-bottom: 18px;
      border: 1px solid #d0d7de;
      border-top: 4px solid #1f3a5f;
      border-radius: 10px;
      background: linear-gradient(135deg, #f3f7fc 0%, #ffffff 70%);
    }
    .doc-eyebrow {
      margin: 0 0 6px;
      color: #1f3a5f;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 10px;
      color: #1f3a5f;
      font-size: 21pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .meta-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid #d0d7de;
      background: #fff;
      color: #424a53;
      font-size: 8.5pt;
    }
    h2 {
      margin: 22px 0 10px;
      padding-bottom: 6px;
      color: #1f3a5f;
      font-size: 13pt;
      font-weight: 700;
      border-bottom: 1.5px solid #d0d7de;
    }
    h3 {
      margin: 0 0 6px;
      color: #1f3a5f;
      font-size: 11.5pt;
      font-weight: 700;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    h4 {
      margin: 0 0 6px;
      color: #1f3a5f;
      font-size: 9.8pt;
      font-weight: 700;
    }
    p { margin: 0 0 10px; }
    .lead { color: #32383f; font-size: 10.5pt; }
    .muted { color: #57606a; font-size: 9.2pt; }
    code {
      color: #cf222e;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 0.9em;
    }
    .base-url-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 8px;
    }
    .base-url-label {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #1f3a5f;
    }
    .code-box {
      margin: 0 0 12px;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      overflow: hidden;
      background: #f6f8fa;
    }
    .code-bar {
      padding: 4px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #57606a;
      background: #eaeef2;
      border-bottom: 1px solid #d0d7de;
    }
    pre {
      margin: 0;
      padding: 10px 12px;
      overflow-x: auto;
      color: #24292f;
      background: #f6f8fa;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    pre code { color: inherit; font-size: inherit; }
    table {
      width: 100%;
      margin: 0 0 12px;
      border-collapse: collapse;
      font-size: 8.8pt;
      border: 1px solid #d0d7de;
    }
    th, td {
      padding: 7px 10px;
      border: 1px solid #d0d7de;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f6f8fa;
      color: #1f3a5f;
      font-weight: 700;
      font-size: 8.2pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .method {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 8.5pt;
      font-weight: 700;
      color: #1f3a5f;
      background: #e8eef6;
    }
    .method[data-method="GET"] { color: #116329; background: #dafbe1; }
    .method[data-method="POST"] { color: #0969da; background: #ddf4ff; }
    .method[data-method="PUT"] { color: #9a6700; background: #fff8c5; }
    .method[data-method="PATCH"] { color: #bc4c00; background: #fff1e5; }
    .method[data-method="DELETE"] { color: #cf222e; background: #ffebe9; }
    .status-chip {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 999px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 8pt;
      font-weight: 700;
    }
    .status-2xx { color: #116329; background: #dafbe1; }
    .status-4xx { color: #9a6700; background: #fff8c5; }
    .status-5xx { color: #cf222e; background: #ffebe9; }
    .yn { font-weight: 700; }
    .yn-yes { color: #116329; }
    .yn-no { color: #6e7781; }
    .note {
      margin: 8px 0 10px;
      padding: 9px 12px;
      color: #424a53;
      background: #f6f8fa;
      border-left: 4px solid #1f3a5f;
      border-radius: 0 6px 6px 0;
      font-size: 9.2pt;
    }
    .endpoint {
      margin: 0 0 8px;
      padding: 14px 16px;
      border: 1px solid #d0d7de;
      border-radius: 10px;
      background: #ffffff;
    }
    .endpoint-head {
      padding-bottom: 8px;
      margin-bottom: 10px;
      border-bottom: 1px solid #eaeef2;
    }
    .endpoint-path { color: #1f2328; font-size: 11pt; }
    .endpoint-summary { margin: 4px 0 0; font-weight: 600; color: #24292f; }
    .endpoint-desc { margin: 4px 0 0; color: #57606a; font-size: 9.3pt; }
    .error-line { margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
    .section-rule {
      margin: 14px 0;
      border: none;
      border-top: 1px dashed #d8dee4;
    }
    .doc-footer {
      margin-top: 26px;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #57606a;
      font-size: 8.8pt;
      border-top: 1px solid #d0d7de;
    }
    .doc-footer p { margin: 0; }
    .keep {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 10px;
    }
    h1, h2, h3, h4 {
      break-after: avoid;
      page-break-after: avoid;
    }
    .section-title {
      break-after: avoid;
      page-break-after: avoid;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      @page { margin: 0; }
      body {
        padding: 18mm 16mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .keep {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      h1, h2, h3, h4 {
        break-after: avoid;
        page-break-after: avoid;
      }
      thead { display: table-header-group; }
      tr, img { break-inside: avoid; page-break-inside: avoid; }
      orphans: 3;
      widows: 3;
    }
  </style>
</head>
<body>
${sections.join("\n")}
</body>
</html>`;
};
