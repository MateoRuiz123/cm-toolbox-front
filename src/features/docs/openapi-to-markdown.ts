import {
  buildOpenApiDocument,
  type FieldSection,
  type OpenApiDocumentView,
  type OperationView,
} from "./openapi-document";

const yesNo = (value: boolean): string => (value ? "✓" : "✗");

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

  if (operation.headers.length > 0) {
    parts.push(
      "#### Headers requeridos",
      "",
      "| Header | Tipo | Requerido | Descripción |",
      "| --- | --- | --- | --- |",
      ...operation.headers.map(
        (h) =>
          `| \`${h.name}\` | ${h.type} | ${yesNo(h.required)} | ${h.description || "—"} |`,
      ),
      "",
    );
  }

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

  if (operation.successStatus) {
    parts.push(`#### Respuesta exitosa (${operation.successStatus})`, "");
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

/** HTML imprimible al estilo de `api_documentacion_mx.pdf` (Markdown corporativo). */
export const openApiToPrintHtml = (document: unknown): string => {
  const doc = buildOpenApiDocument(document);
  const sections: string[] = [];

  sections.push(`<h1>${escapeHtml(doc.title)}</h1>`);
  if (doc.description) {
    sections.push(
      keep(
        "<h2>Descripción General</h2>",
        `<p>${escapeHtml(doc.description)}</p>`,
      ),
    );
  }
  if (doc.serverUrl) {
    sections.push(
      keep(
        "<h2>URL Base</h2>",
        `<p><strong>Ambiente:</strong> <code>${escapeHtml(doc.serverUrl)}</code></p>`,
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
        `<pre><code>${escapeHtml(doc.auth.bearerHint)}</code></pre>`,
      );
    }
    sections.push(keep(...authParts));
    if (doc.auth.curl) {
      sections.push(
        keep(
          "<h4>Ejemplo cURL</h4>",
          `<pre><code>${escapeHtml(doc.auth.curl)}</code></pre>`,
        ),
      );
    }
  }

  sections.push('<h2 class="section-title">Endpoints</h2>');
  for (const [index, op] of doc.operations.entries()) {
    sections.push(`<section class="endpoint">`);
    const intro = [
      `<h3><span class="method">${escapeHtml(op.method)}</span> <code>${escapeHtml(op.path)}</code></h3>`,
    ];
    if (op.summary) intro.push(`<p>${escapeHtml(op.summary)}</p>`);
    if (op.description) intro.push(`<p>${escapeHtml(op.description)}</p>`);
    sections.push(keep(...intro));

    if (op.headers.length > 0) {
      sections.push(
        keep(
          "<h4>Headers Requeridos</h4>",
          "<table><thead><tr><th>Header</th><th>Tipo</th><th>Requerido</th><th>Descripción</th></tr></thead><tbody>",
          ...op.headers.map(
            (h) =>
              `<tr><td><code>${escapeHtml(h.name)}</code></td><td>${escapeHtml(h.type)}</td><td>${yesNo(h.required)}</td><td>${mdInline(h.description)}</td></tr>`,
          ),
          "</tbody></table>",
        ),
      );
    }
    if (op.bodyExample) {
      sections.push(
        keep(
          "<h4>Cuerpo de la Solicitud</h4>",
          `<pre><code>${escapeHtml(op.bodyExample)}</code></pre>`,
        ),
      );
    }
    for (const section of op.bodySections) {
      sections.push(
        keep(
          `<h4>${escapeHtml(section.title)}</h4>`,
          "<table><thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Validaciones</th><th>Descripción</th></tr></thead><tbody>",
          ...section.rows.map(
            (r) =>
              `<tr><td><code>${escapeHtml(r.name)}</code></td><td>${escapeHtml(r.type)}</td><td>${yesNo(r.required)}</td><td>${escapeHtml(r.validations || "—")}</td><td>${mdInline(r.description)}</td></tr>`,
          ),
          "</tbody></table>",
        ),
      );
    }
    if (op.successStatus) {
      const successParts = [
        `<h4>Respuesta Exitosa (${escapeHtml(op.successStatus)})</h4>`,
      ];
      if (op.successExample) {
        successParts.push(
          `<pre><code>${escapeHtml(op.successExample)}</code></pre>`,
        );
      }
      sections.push(keep(...successParts));
    }
    if (op.errors.length > 0) {
      sections.push("<h4>Errores Posibles</h4>");
      for (const err of op.errors) {
        const errorParts = [
          `<p class="error-line"><strong>${escapeHtml(err.status)}</strong>${err.description ? ` — ${escapeHtml(err.description)}` : ""}</p>`,
        ];
        if (err.json) {
          errorParts.push(`<pre><code>${escapeHtml(err.json)}</code></pre>`);
        }
        sections.push(keep(...errorParts));
      }
    }
    sections.push(
      keep(
        "<h4>Ejemplo cURL</h4>",
        `<pre><code>${escapeHtml(op.curl)}</code></pre>`,
      ),
    );
    sections.push("</section>");
    if (index < doc.operations.length - 1) {
      sections.push('<hr class="section-rule" />');
    }
  }

  if (doc.version) {
    sections.push(
      `<footer class="doc-footer"><p>Versión de Documentación: <strong>${escapeHtml(doc.version)}</strong></p></footer>`,
    );
  }

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
      color: #24292f;
      background: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
    }
    h1 {
      margin: 0 0 4px;
      color: #1f3a5f;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    h2 {
      margin: 24px 0 10px;
      padding-bottom: 6px;
      color: #1f3a5f;
      font-size: 13.5pt;
      font-weight: 700;
      border-bottom: 1px solid #d0d7de;
    }
    h3 {
      margin: 0 0 8px;
      color: #1f3a5f;
      font-size: 12pt;
      font-weight: 700;
    }
    h4 {
      margin: 0 0 8px;
      color: #1f3a5f;
      font-size: 10.5pt;
      font-weight: 700;
    }
    p { margin: 0 0 10px; }
    code {
      color: #cf222e;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 0.9em;
    }
    pre {
      margin: 0 0 12px;
      padding: 12px 14px;
      overflow-x: auto;
      color: #24292f;
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
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
      font-size: 9pt;
    }
    th, td {
      padding: 8px 10px;
      border: 1px solid #d0d7de;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f6f8fa;
      color: #1f3a5f;
      font-weight: 600;
    }
    .method { color: #1f3a5f; font-weight: 700; }
    .note {
      margin: 10px 0 12px;
      padding: 10px 14px;
      color: #57606a;
      background: #f6f8fa;
      border-left: 4px solid #d0d7de;
      border-radius: 0 6px 6px 0;
    }
    .error-line { margin: 0 0 6px; }
    .endpoint { margin: 0 0 4px; }
    .section-rule {
      margin: 18px 0;
      border: none;
      border-top: 1px solid #eaeef2;
    }
    .doc-footer {
      margin-top: 28px;
      padding-top: 12px;
      color: #57606a;
      font-size: 9.5pt;
      border-top: 1px solid #d0d7de;
    }
    .doc-footer p { margin: 0; }
    /* Bloques cortos juntos; el endpoint completo NO usa avoid (provoca páginas casi vacías). */
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
