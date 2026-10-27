import { Link } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import type { EffectiveAppAccess } from "./access-types";
import { AppAccessGuard } from "./app-access-guard";

interface DynamicAppRoutePageProps {
  readonly app: EffectiveAppAccess;
}

/**
 * Vista institucional automática para herramientas registradas desde /admin
 * cuya ruta aún no tiene un módulo estático dedicado en src/features/.
 * Envuelve automáticamente el acceso con AppAccessGuard sin requerir editar app.tsx.
 */
export const DynamicAppRoutePage = ({ app }: DynamicAppRoutePageProps) => {
  return (
    <AppAccessGuard appId={app.id}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div
          style={{ boxShadow: "var(--shadow-1)" }}
          className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 sm:p-10"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Herramienta Registrada &bull; {app.id}
            </span>

            <span className="font-mono text-xs text-[var(--text-muted)]">
              Ruta: {app.route}
            </span>
          </div>

          <SmoothTitleAccent
            as="h1"
            className="mb-3 text-2xl font-bold tracking-tight text-[var(--text-body)] sm:text-3xl"
            accessibleTitle={app.name}
            accent={app.name}
            amplitude={3}
          />

          <p className="mb-6 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            {app.description}
          </p>

          {app.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {app.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mb-6 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-body)]">
              Permisos activos en tu sesión para esta herramienta
            </h2>
            <div className="flex flex-wrap gap-2">
              {app.allowedActions.map((act) => (
                <span
                  key={act}
                  className="rounded-[var(--radius-pill)] border border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] px-3 py-1 font-mono text-xs font-bold text-[var(--state-success)]"
                >
                  ✓ {act}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-default)] pt-6">
            <p className="text-xs text-[var(--text-muted)]">
              El control de acceso y estado operativo de esta herramienta ya
              está activo en el portal.
            </p>
            <Link
              to="/"
              className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-action-hover)]"
            >
              Volver al portal
            </Link>
          </div>
        </div>
      </div>
    </AppAccessGuard>
  );
};
