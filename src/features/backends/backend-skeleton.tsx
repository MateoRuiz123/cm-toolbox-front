import { Skeleton, SkeletonRegion } from "@/shared/ui/skeleton";

/** Simula el bloque de 3 métricas (Pods, CPU/RAM, Actividad) de un ambiente. */
export const BackendEnvMetricsSkeleton = () => (
  <div
    aria-hidden="true"
    className="grid grid-cols-1 divide-y divide-[var(--border-default)]/60 rounded-[var(--radius-2)] border border-[var(--border-default)]/70 bg-[var(--surface-card)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
  >
    {[0, 1, 2].map((index) => (
      <div key={index} className="space-y-2 px-3 py-2.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    ))}
  </div>
);

const BackendCardSkeleton = () => (
  <article
    aria-hidden="true"
    className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
  >
    <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--border-default)]/70 pb-2.5">
      <div className="flex items-center gap-2">
        <Skeleton className="size-2.5 rounded-full" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {[0, 1].map((env) => (
        <div
          key={env}
          className="space-y-3 rounded-[var(--radius-2)] border border-l-4 border-[var(--border-default)] bg-[var(--surface-sunken)]/55 p-3.5"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-11 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <BackendEnvMetricsSkeleton />
          <div className="flex gap-1.5 border-t border-[var(--border-default)]/70 pt-2.5">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </article>
);

export interface BackendsListSkeletonProps {
  readonly compact: boolean;
}

/** Esqueleto de la lista completa mientras se carga el catálogo personal. */
export const BackendsListSkeleton = ({ compact }: BackendsListSkeletonProps) => (
  <SkeletonRegion label="Cargando catálogo personal de backends...">
    <div
      className={`grid gap-3.5 ${
        compact ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
      }`}
    >
      {[0, 1, 2].map((index) => (
        <BackendCardSkeleton key={index} />
      ))}
    </div>
  </SkeletonRegion>
);
