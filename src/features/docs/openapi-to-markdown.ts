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
  const parts: string[] = [
    `### ${operation.method} \`${operation.path}\``,
    "",
  ];
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
    parts.push(
      `#### Respuesta exitosa (${operation.successStatus})`,
      "",
    );
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
  const parts: string[] = [
    `# ${doc.title}`,
    "",
  ];
  if (doc.version) parts.push(`Versión: \`${doc.version}\``, "");
  if (doc.description) {
    parts.push("## Descripción general", "", doc.description, "", "---", "");
  }
  if (doc.serverUrl) {
    parts.push("## URL base", "", `- \`${doc.serverUrl}\``, "", "---", "");
  }
  if (doc.auth) {
    parts.push(
      "## Autenticación",
      "",
      doc.auth.description,
      "",
    );
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
  escapeHtml(value).replaceAll(
    /`([^`]+)`/g,
    "<code>$1</code>",
  );

/** HTML imprimible para «Guardar como PDF» (equivalente a `api_documentacion.pdf`). */
export const openApiToPrintHtml = (document: unknown): string => {
  const doc = buildOpenApiDocument(document);
  const sections: string[] = [];

  sections.push(`<h1>${escapeHtml(doc.title)}</h1>`);
  if (doc.version) {
    sections.push(`<p class="meta">Versión: ${escapeHtml(doc.version)}</p>`);
  }
  if (doc.description) {
    sections.push(
      "<h2>Descripción general</h2>",
      `<p>${escapeHtml(doc.description)}</p>`,
    );
  }
  if (doc.serverUrl) {
    sections.push(
      "<h2>URL base</h2>",
      `<ul><li><code>${escapeHtml(doc.serverUrl)}</code></li></ul>`,
    );
  }
  if (doc.auth) {
    sections.push(
      "<h2>Autenticación</h2>",
      `<p>${escapeHtml(doc.auth.description)}</p>`,
    );
    if (doc.auth.curl) {
      sections.push(`<pre>${escapeHtml(doc.auth.curl)}</pre>`);
    }
    if (doc.auth.bearerHint) {
      sections.push(`<pre>${escapeHtml(doc.auth.bearerHint)}</pre>`);
    }
  }

  sections.push("<h2>Endpoints</h2>");
  for (const op of doc.operations) {
    sections.push(
      `<h3>${escapeHtml(op.method)} <code>${escapeHtml(op.path)}</code></h3>`,
    );
    if (op.summary) sections.push(`<p><strong>${escapeHtml(op.summary)}</strong></p>`);
    if (op.description) sections.push(`<p>${escapeHtml(op.description)}</p>`);

    if (op.headers.length > 0) {
      sections.push(
        "<h4>Headers requeridos</h4>",
        "<table><thead><tr><th>Header</th><th>Tipo</th><th>Requerido</th><th>Descripción</th></tr></thead><tbody>",
        ...op.headers.map(
          (h) =>
            `<tr><td><code>${escapeHtml(h.name)}</code></td><td>${escapeHtml(h.type)}</td><td>${yesNo(h.required)}</td><td>${mdInline(h.description)}</td></tr>`,
        ),
        "</tbody></table>",
      );
    }
    if (op.bodyExample) {
      sections.push(
        "<h4>Cuerpo de la solicitud</h4>",
        `<pre>${escapeHtml(op.bodyExample)}</pre>`,
      );
    }
    for (const section of op.bodySections) {
      sections.push(
        `<h4>${escapeHtml(section.title)}</h4>`,
        "<table><thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Validaciones</th><th>Descripción</th></tr></thead><tbody>",
        ...section.rows.map(
          (r) =>
            `<tr><td><code>${escapeHtml(r.name)}</code></td><td>${escapeHtml(r.type)}</td><td>${yesNo(r.required)}</td><td>${escapeHtml(r.validations || "—")}</td><td>${mdInline(r.description)}</td></tr>`,
        ),
        "</tbody></table>",
      );
    }
    if (op.successStatus) {
      sections.push(`<h4>Respuesta exitosa (${escapeHtml(op.successStatus)})</h4>`);
      if (op.successExample) {
        sections.push(`<pre>${escapeHtml(op.successExample)}</pre>`);
      }
    }
    if (op.errors.length > 0) {
      sections.push("<h4>Errores posibles</h4><ul>");
      for (const err of op.errors) {
        sections.push(
          `<li><strong>${escapeHtml(err.status)}</strong>${err.description ? ` — ${escapeHtml(err.description)}` : ""}</li>`,
        );
        if (err.json) sections.push(`<pre>${escapeHtml(err.json)}</pre>`);
      }
      sections.push("</ul>");
    }
    sections.push(
      "<h4>Ejemplo cURL</h4>",
      `<pre>${escapeHtml(op.curl)}</pre>`,
      "<hr />",
    );
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    @page { margin: 18mm 16mm; }
    body { font-family: "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.45; }
    h1 { font-size: 22pt; margin: 0 0 8px; }
    h2 { font-size: 14pt; margin: 28px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { font-size: 12pt; margin: 22px 0 8px; }
    h4 { font-size: 11pt; margin: 16px 0 6px; }
    .meta { color: #555; font-family: ui-monospace, monospace; font-size: 10pt; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 9.5pt; }
    th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f3f3; }
    pre { background: #f6f6f6; border: 1px solid #ddd; padding: 10px; overflow-x: auto; font-size: 9pt; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  </style>
</head>
<body>
${sections.join("\n")}
<script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
};
