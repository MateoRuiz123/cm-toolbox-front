import { useMovimientoReducido } from "../lib/use-movimiento-reducido";

export type RouteSkeletonVariant =
  | "hub"
  | "diagnostico"
  | "logs"
  | "backends"
  | "docs"
  | "admin"
  | "default";

export interface RouteSkeletonFallbackProps {
  readonly variant?: RouteSkeletonVariant;
  readonly label?: string;
}

const inferVariantFromLocation = (): RouteSkeletonVariant => {
  if (typeof window === "undefined") return "default";
  const path = (
    window.location.hash.replace(/^#/, "") || window.location.pathname
  ).toLowerCase();
  if (path === "/" || path.startsWith("/hub")) return "hub";
  if (path.startsWith("/diagnostico")) return "diagnostico";
  if (path.startsWith("/logs")) return "logs";
  if (path.startsWith("/backends")) return "backends";
  if (path.startsWith("/docs") || path.startsWith("/cliente/docs")) {
    return "docs";
  }
  if (path.startsWith("/admin")) return "admin";
  return "default";
};

/**
 * Fallback de carga específico por ruta para evitar saltos de layout durante el code-splitting.
 */
export const RouteSkeletonFallback = ({
  variant,
  label = "Cargando…",
}: RouteSkeletonFallbackProps) => {
  const reducirMovimiento = useMovimientoReducido();
  const activeVariant = variant ?? inferVariantFromLocation();
  const pulseClass = reducirMovimiento ? "" : "skeleton-shimmer";

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-skeleton-variant={activeVariant}
      className="mx-auto w-full max-w-6xl bg-[var(--surface-app)] px-4 py-8 sm:px-6"
    >
      <span className="sr-only">{label}</span>

      {activeVariant === "hub" && (
        <div className="space-y-6">
          <div className="space-y-2 border-b border-[var(--border-default)] pb-6">
            <div
              className={`h-5 w-44 rounded-full bg-[var(--surface-card)] ${pulseClass}`}
            />
            <div
              className={`h-9 w-80 max-w-full rounded-[var(--radius-2)] bg-[var(--surface-card)] ${pulseClass}`}
            />
            <div
              className={`h-4 w-96 max-w-full rounded-[var(--radius-1)] bg-[var(--surface-card)] ${pulseClass}`}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
            <div
              className={`h-52 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] md:col-span-6 lg:col-span-7 ${pulseClass}`}
            />
            <div
              className={`h-52 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] md:col-span-3 lg:col-span-5 ${pulseClass}`}
            />
            <div
              className={`h-44 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] md:col-span-3 lg:col-span-4 ${pulseClass}`}
            />
            <div
              className={`h-44 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] md:col-span-6 lg:col-span-8 ${pulseClass}`}
            />
          </div>
        </div>
      )}

      {activeVariant === "diagnostico" && (
        <div className="space-y-5">
          <div
            className={`h-24 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 ${pulseClass}`}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              className={`h-28 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
            />
            <div
              className={`h-28 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
            />
            <div
              className={`h-28 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
            />
          </div>
          <div
            className={`h-64 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
          />
        </div>
      )}

      {activeVariant === "logs" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            className={`h-80 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] lg:col-span-4 ${pulseClass}`}
          />
          <div
            className={`h-80 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] lg:col-span-8 ${pulseClass}`}
          />
        </div>
      )}

      {activeVariant === "backends" && (
        <div className="space-y-4">
          <div className="space-y-2 border-b border-[var(--border-default)] pb-4">
            <div
              className={`h-5 w-40 rounded-full bg-[var(--surface-card)] ${pulseClass}`}
            />
            <div
              className={`h-9 w-64 max-w-full rounded-[var(--radius-2)] bg-[var(--surface-card)] ${pulseClass}`}
            />
          </div>
          <div
            className={`h-12 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
          />
          <div
            className={`h-72 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
          />
        </div>
      )}

      {activeVariant === "docs" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            className={`h-72 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] lg:col-span-3 ${pulseClass}`}
          />
          <div
            className={`h-96 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] lg:col-span-9 ${pulseClass}`}
          />
        </div>
      )}

      {activeVariant === "admin" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div
              className={`h-10 w-32 rounded-[var(--radius-pill)] bg-[var(--surface-card)] ${pulseClass}`}
            />
            <div
              className={`h-10 w-32 rounded-[var(--radius-pill)] bg-[var(--surface-card)] ${pulseClass}`}
            />
            <div
              className={`h-10 w-32 rounded-[var(--radius-pill)] bg-[var(--surface-card)] ${pulseClass}`}
            />
          </div>
          <div
            className={`h-72 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
          />
        </div>
      )}

      {activeVariant === "default" && (
        <div className="mx-auto max-w-3xl space-y-4">
          <div
            className={`h-10 w-2/3 rounded-[var(--radius-2)] bg-[var(--surface-card)] ${pulseClass}`}
          />
          <div
            className={`h-48 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] ${pulseClass}`}
          />
        </div>
      )}
    </div>
  );
};
