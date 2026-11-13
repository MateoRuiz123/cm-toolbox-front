import { useEffect, useMemo, useRef } from "react";
import { downloadOpenApiMarkdown } from "./export-openapi-docs";
import { openApiToPrintHtml } from "./openapi-to-markdown";

type ExportPdfModalProps = {
  readonly openApiDocument: unknown;
  readonly onClose: () => void;
};

/** Vista previa imprimible de la documentación OpenAPI (Guardar como PDF). */
export const ExportPdfModal = ({
  openApiDocument,
  onClose,
}: ExportPdfModalProps) => {
  const html = useMemo(
    () => openApiToPrintHtml(openApiDocument),
    [openApiDocument],
  );
  const previewUrl = useMemo(() => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [html]);
  const dialogRef = useRef<HTMLElement>(null);
  const printButtonRef = useRef<HTMLButtonElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const originalOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";
    return () => {
      globalThis.document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  useEffect(() => {
    printButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    const frame = iframeRef.current;
    const frameWindow = frame?.contentWindow;
    const frameDocument = frame?.contentDocument;
    if (!frameWindow || !frameDocument) return;

    // Sin título ni cabeceras/pies del navegador (URL, fecha, numeración).
    const previousTitle = frameDocument.title;
    frameDocument.title = "";
    const restoreTitle = () => {
      frameDocument.title = previousTitle;
      frameWindow.removeEventListener("afterprint", restoreTitle);
    };
    frameWindow.addEventListener("afterprint", restoreTitle);
    frameWindow.focus();
    frameWindow.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-pdf-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={dialogRef}
        style={{ boxShadow: "var(--shadow-24)" }}
        className="surface flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] animate-modal-dialog"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-3.5">
          <div className="min-w-0">
            <h2
              id="export-pdf-title"
              className="text-sm font-bold uppercase tracking-wider text-[var(--text-body)]"
            >
              Exportar PDF
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Revisa la vista previa y usa Imprimir → Guardar como PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa de PDF"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-1)] text-[var(--text-muted)] transition-colors hover:bg-[var(--border-default)]/30 hover:text-[var(--text-body)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M18 6 6 18M6 6l12 12"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-[var(--surface-sunken)] p-4 sm:p-6">
          <div className="mx-auto h-[min(64vh,42rem)] max-w-[780px] overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] bg-white shadow-[var(--shadow-24)]">
            <iframe
              ref={iframeRef}
              title="Vista previa de la documentación para PDF"
              src={previewUrl}
              className="h-full w-full border-0 bg-white"
            />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--border-default)] bg-[var(--surface-bar)] p-3.5 px-5">
          <button
            type="button"
            onClick={() => downloadOpenApiMarkdown(openApiDocument)}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
          >
            Descargar Markdown (.md)
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)]"
            >
              Cerrar
            </button>
            <button
              ref={printButtonRef}
              type="button"
              onClick={handlePrint}
              className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)]"
            >
              Imprimir / Guardar PDF
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
