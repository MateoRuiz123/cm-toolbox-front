import { openApiToMarkdown, openApiToPrintHtml } from "./openapi-to-markdown";

const slugFileName = (title: string, ext: string): string => {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
  return `${base || "api_documentacion"}.${ext}`;
};

const triggerDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/** Descarga Markdown al estilo `api_documentacion.md`. */
export const downloadOpenApiMarkdown = (
  document: unknown,
  titleHint?: string,
): void => {
  const markdown = openApiToMarkdown(document);
  const title =
    titleHint ??
    (typeof document === "object" &&
    document !== null &&
    "info" in document &&
    typeof (document as { info?: { title?: unknown } }).info?.title === "string"
      ? (document as { info: { title: string } }).info.title
      : "api_documentacion");
  triggerDownload(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    slugFileName(title, "md"),
  );
};

/**
 * Abre una vista imprimible para guardar PDF (mismo contenido que el Markdown
 * de integración, análogo a `api_documentacion.pdf`).
 */
export const exportOpenApiPdf = (document: unknown): void => {
  const html = openApiToPrintHtml(document);
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) {
    throw new Error(
      "El navegador bloqueó la ventana de exportación. Permite popups e inténtalo de nuevo.",
    );
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};
