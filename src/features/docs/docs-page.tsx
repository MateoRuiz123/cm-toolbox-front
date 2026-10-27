import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { DocsApiError, fetchDocsCatalog } from "./api/docs-api";
import type { DocsApiSummary } from "./api/types";
import { ApiCard } from "./api-card";
import { DocsEmptyState } from "./empty-state";

type DocsPageProps = {
  readonly basePath?: string;
  readonly canManage?: boolean;
  /** F-F / C-G: 401 → relogin de la puerta activa (interno o /cliente). */
  readonly onUnauthorized?: () => void;
};

export const DocsPage = ({
  basePath = "/docs",
  canManage = false,
  onUnauthorized,
}: DocsPageProps) => {
  const [apis, setApis] = useState<DocsApiSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDocsCatalog();
      setApis(data);
    } catch (e) {
      if (e instanceof DocsApiError && e.status === 401 && onUnauthorized) {
        onUnauthorized();
        return;
      }
      const message =
        e instanceof DocsApiError
          ? e.message
          : "No pudimos cargar la documentación. Intenta de nuevo.";
      setError(message);
      setApis(null);
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <SmoothTitleAccent
            as="h1"
            className="text-2xl font-bold text-[var(--text-body)]"
            accessibleTitle="Documentación de APIs"
            before="Documentación de "
            accent="APIs"
            amplitude={3}
          />
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Consulta las especificaciones OpenAPI vigentes con acceso
            controlado.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/docs/admin"
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
            >
              Administrar
            </Link>
            <Link
              to="/docs/admin/nueva"
              className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-contrast)] transition hover:bg-[var(--color-primary-hover)]"
            >
              Nueva documentación
            </Link>
            <Link
              to="/docs/admin/clientes"
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
            >
              Clientes
            </Link>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          aria-busy="true"
          aria-live="polite"
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[var(--radius-3)] bg-[var(--surface-sunken)]"
            />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <DocsEmptyState
          title={error}
          actionLabel="Reintentar"
          onAction={() => void load()}
        />
      ) : null}

      {!loading && !error && apis && apis.length === 0 ? (
        <div
          className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-6 py-10 text-center"
          role="status"
        >
          <SmoothTitleAccent
            as="h2"
            className="text-lg font-bold text-[var(--text-body)]"
            accessibleTitle="No hay documentación disponible para tu usuario."
            before="No hay documentación disponible para tu "
            accent="usuario."
            amplitude={2}
          />
        </div>
      ) : null}

      {!loading && !error && apis && apis.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {apis.map((api) => (
            <ApiCard
              key={api.id}
              api={api}
              basePath={basePath}
              canManage={canManage}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
