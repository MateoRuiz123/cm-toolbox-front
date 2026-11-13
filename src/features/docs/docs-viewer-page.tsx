import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  deleteAdminApi,
  DocsApiError,
  fetchApiVersions,
  fetchOpenApi,
  restoreApiVersion,
} from "./api/docs-api";
import type { DocsSpecVersion } from "./api/types";
import { DocsEmptyState } from "./empty-state";
import { downloadOpenApiMarkdown } from "./export-openapi-docs";
import { ExportPdfModal } from "./export-pdf-modal";
import { OpenApiViewer } from "./openapi-viewer";
import { EditApiForm } from "./admin/edit-api-form";
import { PublishSpecForm } from "./admin/publish-spec-form";

const API_ID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ManageTab = "config" | "publish" | "versions";

type ManageApiModalProps = {
  readonly apiId: string;
  readonly basePath: string;
  readonly canManage: boolean;
  readonly showPublish: boolean;
  readonly onClose: () => void;
  readonly onPublished: (version: string) => void;
};

const ManageApiModal = ({
  apiId,
  basePath,
  canManage,
  showPublish,
  onClose,
  onPublished,
}: ManageApiModalProps) => {
  const navigate = useNavigate();
  const initialTab: ManageTab = canManage
    ? "config"
    : showPublish
      ? "publish"
      : "versions";
  const [tab, setTab] = useState<ManageTab>(initialTab);
  const [versions, setVersions] = useState<readonly DocsSpecVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoadingVersions(true);
    setActionError(null);
    try {
      const list = await fetchApiVersions(apiId);
      setVersions(list);
    } catch (err) {
      setActionError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible cargar el historial de versiones.",
      );
    } finally {
      setLoadingVersions(false);
    }
  }, [apiId]);

  useEffect(() => {
    if (tab === "versions") {
      void loadVersions();
    }
  }, [tab, loadVersions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleRestore = async (version: string) => {
    setRestoringVersion(version);
    setActionError(null);
    try {
      const res = await restoreApiVersion(apiId, version);
      onPublished(res.version);
      await loadVersions();
    } catch (err) {
      setActionError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible restaurar la versión seleccionada.",
      );
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setActionError(null);
    try {
      await deleteAdminApi(apiId);
      onClose();
      navigate(basePath, { replace: true });
    } catch (err) {
      setActionError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible eliminar la documentación.",
      );
      setDeleting(false);
    }
  };

  const tabButton = (id: ManageTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setActionError(null);
        setTab(id);
      }}
      className={`cursor-pointer rounded-[var(--radius-pill)] px-3.5 py-1.5 text-xs font-semibold transition ${
        tab === id
          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
          : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--color-primary)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-api-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        style={{ boxShadow: "var(--shadow-24)" }}
        className="surface flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] animate-modal-dialog"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-3.5">
          <div>
            <h2
              id="manage-api-title"
              className="text-sm font-bold uppercase tracking-wider text-[var(--text-body)]"
            >
              Gestionar documentación
            </h2>
            <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
              {apiId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestión de documentación"
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

        <div className="flex flex-wrap gap-2 border-b border-[var(--border-default)] bg-[var(--surface-bar)] px-5 py-3">
          {canManage ? tabButton("config", "Configuración y audiencias") : null}
          {showPublish ? tabButton("publish", "Publicar versión") : null}
          {canManage || showPublish
            ? tabButton("versions", "Historial de versiones")
            : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {actionError ? (
            <p
              className="mb-4 rounded-[var(--radius-1)] bg-[var(--alert-error-bg)] px-3 py-2 text-sm text-[var(--state-error)]"
              role="alert"
            >
              {actionError}
            </p>
          ) : null}

          {tab === "config" && canManage ? (
            <div className="space-y-6">
              <EditApiForm apiId={apiId} />

              <section className="rounded-[var(--radius-3)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-4">
                <h3 className="text-sm font-bold text-[var(--state-error)]">
                  Zona de riesgo
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Elimina permanentemente esta documentación y todas sus
                  versiones publicadas.
                </p>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="mt-3 cursor-pointer rounded-[var(--radius-pill)] border border-[var(--state-error)]/40 bg-[var(--surface-card)] px-4 py-1.5 text-xs font-bold text-[var(--state-error)] transition hover:bg-[var(--state-error)] hover:text-white"
                  >
                    Eliminar documentación
                  </button>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void handleDelete()}
                      className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--state-error)] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {deleting ? "Eliminando…" : "Confirmar eliminación"}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setConfirmDelete(false)}
                      className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-1.5 text-xs font-semibold text-[var(--text-body)]"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {tab === "publish" && showPublish ? (
            <PublishSpecForm
              apiId={apiId}
              onPublished={(version) => {
                onPublished(version);
              }}
            />
          ) : null}

          {tab === "versions" ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Versiones publicadas recientemente. Puedes restaurar una versión
                anterior en un clic.
              </p>
              {loadingVersions ? (
                <p
                  className="text-xs text-[var(--text-muted)]"
                  aria-busy="true"
                >
                  Cargando versiones…
                </p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Aún no hay versiones registradas en el historial.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border-default)] rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)]">
                  {versions.map((v, idx) => (
                    <li
                      key={`${v.version}-${v.updatedAt}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[var(--text-body)]">
                            v{v.version}
                          </span>
                          {idx === 0 ? (
                            <span className="rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--state-success)_16%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--state-success)]">
                              Reciente
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {new Date(v.updatedAt).toLocaleString("es-CO")}
                          {v.updatedBy ? ` · ${v.updatedBy}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={restoringVersion === v.version}
                        onClick={() => void handleRestore(v.version)}
                        className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] disabled:opacity-50"
                      >
                        {restoringVersion === v.version
                          ? "Restaurando…"
                          : "Restaurar"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

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
  const [showManageModal, setShowManageModal] = useState(false);

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

  const canAdministerApi = canManage || showPublish;

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-contrast)] transition hover:bg-[var(--color-primary-hover)]"
              >
                Exportar PDF
              </button>
              <button
                type="button"
                onClick={() => downloadOpenApiMarkdown(doc)}
                className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
              >
                Descargar Markdown
              </button>
              {versionHint ? (
                <p className="text-xs text-[var(--text-muted)]" role="status">
                  Versión publicada: {versionHint}
                </p>
              ) : null}
            </div>
            {canAdministerApi ? (
              <button
                type="button"
                onClick={() => setShowManageModal(true)}
                className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
              >
                Gestionar API
              </button>
            ) : null}
          </div>
          <OpenApiViewer document={doc} />
          {showPdfModal ? (
            <ExportPdfModal
              openApiDocument={doc}
              onClose={() => setShowPdfModal(false)}
            />
          ) : null}
          {showManageModal && canAdministerApi ? (
            <ManageApiModal
              apiId={apiId}
              basePath={basePath}
              canManage={canManage}
              showPublish={showPublish}
              onClose={() => setShowManageModal(false)}
              onPublished={(version) => {
                setVersionHint(version);
                void load();
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
};
