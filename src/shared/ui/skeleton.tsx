import type { ReactNode } from "react";

export interface SkeletonProps {
  readonly className?: string;
}

/** Bloque gris con efecto shimmer. Se desactiva con "reducir movimiento". */
export const Skeleton = ({ className = "" }: SkeletonProps) => {
  const radius = /\brounded/.test(className) ? "" : "rounded-[var(--radius-1)]";
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer bg-[var(--surface-sunken)] ${radius} ${className}`}
    />
  );
};

export interface SkeletonRegionProps {
  readonly label: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Contenedor accesible: anuncia `label` a lectores de pantalla y marca `aria-busy`. */
export const SkeletonRegion = ({
  label,
  className = "",
  children,
}: SkeletonRegionProps) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className={className}
  >
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

export interface SkeletonTextProps {
  readonly lines?: number;
  readonly className?: string;
}

/** Párrafo simulado; la última línea es más corta. */
export const SkeletonText = ({ lines = 3, className = "" }: SkeletonTextProps) => (
  <div aria-hidden="true" className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton
        key={index}
        className={`h-3 ${index === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`}
      />
    ))}
  </div>
);
