import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { DocsApiError, fetchOpenApi } from "./api/docs-api";
import { DocsEmptyState } from "./empty-state";
import { downloadOpenApiMarkdown } from "./export-openapi-docs";
import { ExportPdfModal } from "./export-pdf-modal";
import { OpenApiViewer } from "./openapi-viewer";
import { EditApiForm } from "./admin/edit-api-form";
import { PublishSpecForm } from "./admin/publish-spec-form";

const API_ID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type DocsViewerPageProps = {
  readonly basePath?: string;
  readonly showPublish?: boolean;
  readonly canManage?: boolean;
  /** F-F / C-G: 401 → relogin de la puerta activa (interno o /cliente). */
  readonly onUnauthorized?: () => void;
};

export const DocsViewerPage = ({
  basePath = "/docs",
  showPublish = true,
  canManage = false,
  onUnauthorized,
}: DocsViewerPageProps) => {
  const { apiId = "" } = useParams();
  const validId = API_ID_SLUG.test(apiId);
  const [doc, setDoc] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionHint, setVersionHint] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const load = useCallback(async () => {
    if (!validId) {
      setError("No se encontró la documentación solicitada.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const openapi = await fetchOpenApi(apiId);
      setDoc(openapi);
    } catch (e) {
      if (e instanceof DocsApiError && e.status === 401 && onUnauthorized) {
        onUnauthorized();
        return;
      }
      setDoc(null);
      setError(
        e instanceof DocsApiError
          ? e.message
          : "No pudimos cargar la documentación. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiId, onUnauthorized, validId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          to={basePath}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Volver al catálogo
        </Link>
      </div>

      {loading ? (
        <div
          className="h-64 animate-pulse rounded-[var(--radius-3)] bg-[var(--surface-sunken)]"
          aria-busy="true"
        />
      ) : null}

      {!loading && error ? (
        <DocsEmptyState
          title={error}
          actionLabel="Reintentar"
          onAction={() => void load()}
        />
      ) : null}

      {!loading && !error && doc ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-contrast)] transition hover:bg-[var(--color-primary-hover)]"
            >
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={() => downloadOpenApiMarkdown(doc)}
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
            >
              Descargar Markdown
            </button>
            {versionHint ? (
              <p className="text-xs text-[var(--text-muted)]" role="status">
                Versión publicada: {versionHint}
              </p>
            ) : null}
          </div>
          <OpenApiViewer document={doc} />
          {canManage ? <EditApiForm apiId={apiId} /> : null}
          {showPublish ? (
            <PublishSpecForm
              apiId={apiId}
              onPublished={(version) => {
                setVersionHint(version);
                void load();
              }}
            />
          ) : null}
          {showPdfModal ? (
            <ExportPdfModal
              openApiDocument={doc}
              onClose={() => setShowPdfModal(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
};
