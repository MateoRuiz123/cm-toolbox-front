import { useEffect, useRef, useState } from "react";

interface JsonModalProps {
  data: unknown;
  onClose: () => void;
}

/** Presenta y permite copiar la respuesta cruda del diagnóstico en un Dialog SIGO Droop. */
export const JsonModal = ({ data, onClose }: JsonModalProps) => {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll lock en el body
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Autoenfoque y trampa de foco (Escape / Tab)
  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements =
          dialogRef.current.querySelectorAll<HTMLElement>(
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
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="json-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={dialogRef}
        style={{ boxShadow: "var(--shadow-24)" }}
        className="surface flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] animate-modal-dialog"
      >
        <header className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-3.5">
          <h2
            id="json-title"
            className="text-sm font-bold uppercase tracking-wider text-[var(--text-body)]"
          >
            Respuesta JSON Completa
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar JSON"
            className="grid size-8 cursor-pointer place-items-center rounded-[var(--radius-1)] text-[var(--text-muted)] hover:bg-[var(--border-default)]/30 hover:text-[var(--text-body)] transition-colors"
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

        <pre className="m-0 overflow-auto border-y border-[var(--code-border)] bg-[var(--code-bg)] p-5 text-left font-mono text-xs leading-[1.7] text-[var(--code-fg)] select-all">
          {json}
        </pre>

        <footer className="flex items-center justify-end gap-2.5 border-t border-[var(--border-default)] bg-[var(--surface-bar)] p-3.5 px-5">
          <button
            type="button"
            onClick={handleCopy}
            className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)]"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1.5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Copiado al portapapeles</span>
              </span>
            ) : (
              "Copiar JSON"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)]"
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  );
};
