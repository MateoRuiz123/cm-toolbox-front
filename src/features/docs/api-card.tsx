import { Link } from "react-router";
import type { DocsApiSummary } from "./api/types";

type ApiCardProps = {
  readonly api: DocsApiSummary;
  readonly basePath?: string;
  readonly canManage?: boolean;
};

export const ApiCard = ({
  api,
  basePath = "/docs",
  canManage = false,
}: ApiCardProps) => (
  <article className="surface rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 transition hover:border-[var(--color-primary)]">
    <Link
      to={`${basePath}/${api.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      aria-label={`Ver documentación de ${api.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-[var(--text-body)]">
          {api.name}
        </h2>
        <span className="shrink-0 rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 font-mono text-xs text-[var(--text-muted)]">
          v{api.version}
        </span>
      </div>
      {api.description ? (
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {api.description}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Actualizado {new Date(api.updatedAt).toLocaleString("es-CO")}
      </p>
    </Link>
    {canManage ? (
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-default)] pt-3">
        <Link
          to={`${basePath}/${api.id}`}
          className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]"
        >
          Editar
        </Link>
      </div>
    ) : null}
  </article>
);
