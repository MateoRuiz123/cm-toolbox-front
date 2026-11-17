import type { LogEnvironment } from "../logs/api/logs-types";
import { buildGcpLogsExplorerUrl, buildGkeWorkloadUrl } from "../logs/gcp-links";
import type {
  BackendEnvTarget,
  UserBackendItem,
  WorkloadTelemetryData,
} from "./api/backends-api";

export interface BackendEnvSnapshot {
  readonly data?: WorkloadTelemetryData;
  readonly loading: boolean;
  readonly error?: string;
  readonly requiresAuth?: boolean;
}

export interface BackendComparisonCardProps {
  readonly backend: UserBackendItem;
  readonly canViewProd: boolean;
  readonly testSnapshot?: BackendEnvSnapshot;
  readonly prodSnapshot?: BackendEnvSnapshot;
  readonly onRefreshEnv: (
    backend: UserBackendItem,
    env: LogEnvironment,
  ) => void;
  readonly onQuickLogs: (
    backend: UserBackendItem,
    env: LogEnvironment,
    target: BackendEnvTarget,
  ) => void;
  readonly onOpenInLogs: (env: LogEnvironment, target: BackendEnvTarget) => void;
  readonly onRequestAuth: (env: LogEnvironment) => void;
  readonly onEdit: (backend: UserBackendItem) => void;
  readonly onDelete: (backend: UserBackendItem) => void;
}

const ExternalLinkIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-3 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
  </svg>
);

const formatRelativeAge = (isoDate: string | null): string => {
  if (!isoDate) return "Sin dato";
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return "Sin dato";
  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays}d`;
};

const renderEnvStatusBadge = (
  target: BackendEnvTarget | null,
  env: LogEnvironment,
  canViewProd: boolean,
  snapshot?: BackendEnvSnapshot,
) => {
  if (env === "prod" && !canViewProd) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
        Sin permiso Prod
      </span>
    );
  }
  if (!target) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
        No configurado
      </span>
    );
  }
  if (snapshot?.loading && !snapshot.data) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
        Consultando...
      </span>
    );
  }
  if (snapshot?.requiresAuth) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--alert-warning-fg)]">
        Requiere auth GKE
      </span>
    );
  }
  if (snapshot?.error) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--alert-error-fg)]">
        Error lectura
      </span>
    );
  }
  const status = snapshot?.data?.status;
  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--state-success)]/35 bg-[var(--alert-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--alert-success-fg)]">
        <span className="size-1.5 rounded-full bg-[var(--state-success)]" />
        Operativo
      </span>
    );
  }
  if (status === "degraded") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--alert-warning-fg)]">
        <span className="size-1.5 rounded-full bg-[var(--state-warning)]" />
        Degradado
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--alert-error-fg)]">
        <span className="size-1.5 rounded-full bg-[var(--state-error)]" />
        Sin pods
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
      Listo
    </span>
  );
};

interface EnvColumnProps {
  readonly backend: UserBackendItem;
  readonly env: LogEnvironment;
  readonly target: BackendEnvTarget | null;
  readonly canViewProd: boolean;
  readonly snapshot?: BackendEnvSnapshot;
  readonly onRefreshEnv: (
    backend: UserBackendItem,
    env: LogEnvironment,
  ) => void;
  readonly onQuickLogs: (
    backend: UserBackendItem,
    env: LogEnvironment,
    target: BackendEnvTarget,
  ) => void;
  readonly onOpenInLogs: (env: LogEnvironment, target: BackendEnvTarget) => void;
  readonly onRequestAuth: (env: LogEnvironment) => void;
  readonly onEdit: (backend: UserBackendItem) => void;
}

const BackendEnvColumn = ({
  backend,
  env,
  target,
  canViewProd,
  snapshot,
  onRefreshEnv,
  onQuickLogs,
  onOpenInLogs,
  onRequestAuth,
  onEdit,
}: EnvColumnProps) => {
  const isProdBlocked = env === "prod" && !canViewProd;
  const telemetry = snapshot?.data;
  const gcpTarget = target
    ? {
        workload: target.workload,
        namespace: target.namespace,
        cluster: target.cluster,
        env,
      }
    : null;

  return (
    <section
      aria-label={`${backend.name} en ${env === "prod" ? "Producción" : "Test"}`}
      className="flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/55 p-3"
    >
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                env === "prod"
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
              }`}
            >
              {env === "prod" ? "PROD" : "TEST"}
            </span>
            {renderEnvStatusBadge(target, env, canViewProd, snapshot)}
            {target && !isProdBlocked && (
              <span className="truncate font-mono text-[11px] text-[var(--text-muted)]">
                {target.cluster}/{target.namespace}/
                <strong className="font-semibold text-[var(--text-body)]">
                  {target.workload}
                </strong>
              </span>
            )}
          </div>

          {target && !isProdBlocked && (
            <button
              type="button"
              disabled={snapshot?.loading}
              aria-label={`Actualizar ${env.toUpperCase()} de ${backend.name}`}
              onClick={() => onRefreshEnv(backend, env)}
              className="shrink-0 cursor-pointer rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-60"
            >
              {snapshot?.loading ? "..." : "Refrescar"}
            </button>
          )}
        </div>

        {isProdBlocked ? (
          <p className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2.5 text-center text-[11px] text-[var(--text-muted)]">
            Tu rol no tiene permiso <span className="font-mono">logs:view_prod</span>{" "}
            para Producción.
          </p>
        ) : !target ? (
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-1)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)]/60 px-3 py-2.5">
            <p className="text-[11px] text-[var(--text-muted)]">
              Sin workload asignado en {env === "prod" ? "Producción" : "Test"}.
            </p>
            <button
              type="button"
              onClick={() => onEdit(backend)}
              className="shrink-0 cursor-pointer text-[11px] font-bold text-[var(--color-primary)] hover:underline"
            >
              + Configurar {env.toUpperCase()}
            </button>
          </div>
        ) : (
          <>
            {snapshot?.requiresAuth && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-[var(--radius-1)] border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2.5 py-1.5 text-[11px] text-[var(--alert-warning-fg)]">
                <span>Credenciales GKE expiradas</span>
                <button
                  type="button"
                  onClick={() => onRequestAuth(env)}
                  className="cursor-pointer rounded-full bg-[var(--state-warning)] px-2.5 py-0.5 text-[10px] font-bold text-white"
                >
                  Autenticar GKE
                </button>
              </div>
            )}

            {snapshot?.error && !snapshot.requiresAuth && (
              <div className="mb-2 rounded-[var(--radius-1)] border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-2.5 py-1.5 text-[11px] text-[var(--alert-error-fg)]">
                {snapshot.error}
              </div>
            )}

            {telemetry && (
              <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-4">
                <div className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Pods &amp; Reinicios
                  </span>
                  <span className="mt-0.5 block font-mono text-xs font-bold text-[var(--text-body)]">
                    {telemetry.readyReplicas}/{telemetry.desiredReplicas} Ready
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {telemetry.totalRestarts}{" "}
                    {telemetry.totalRestarts === 1 ? "reinicio" : "reinicios"}
                  </span>
                </div>

                <div className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    CPU / Memoria
                  </span>
                  <span className="mt-0.5 block font-mono text-xs font-bold text-[var(--text-body)]">
                    {telemetry.totalCpuMillicores !== null
                      ? `${telemetry.totalCpuMillicores}m`
                      : "—"}
                    {" / "}
                    {telemetry.totalMemoryMiB !== null
                      ? `${telemetry.totalMemoryMiB}Mi`
                      : "—"}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {telemetry.pods.length} pod(s)
                  </span>
                </div>

                <div className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Tráfico ({telemetry.traffic.windowMinutes}m)
                  </span>
                  <span className="mt-0.5 block font-mono text-xs font-bold text-[var(--text-body)]">
                    {telemetry.traffic.rpm} req/m
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    4xx: {telemetry.traffic.rate4xxPercent}% &bull; 5xx:{" "}
                    {telemetry.traffic.rate5xxPercent}%
                  </span>
                </div>

                <div className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Último deploy
                  </span>
                  <span className="mt-0.5 block text-xs font-bold text-[var(--text-body)]">
                    {formatRelativeAge(telemetry.deployedAt)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {telemetry.httpHealthStatus
                      ? `Health ${telemetry.httpHealthStatus.toUpperCase()}${
                          telemetry.httpLatencyMs
                            ? ` · ${telemetry.httpLatencyMs}ms`
                            : ""
                        }`
                      : "Sonda GKE"}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {target && gcpTarget && !isProdBlocked && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--border-default)]/70 pt-2">
          <button
            type="button"
            onClick={() => onQuickLogs(backend, env, target)}
            className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-3 py-1 text-[11px] font-bold text-[var(--color-action-contrast)] transition hover:bg-[var(--color-action-hover)]"
          >
            Vista rápida de logs
          </button>
          <button
            type="button"
            onClick={() => onOpenInLogs(env, target)}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Abrir en /logs
          </button>
          <a
            href={buildGkeWorkloadUrl(gcpTarget)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Abrir carga de trabajo ${target.workload} (${env.toUpperCase()}) en GKE`}
            aria-label={`Workload GKE (${env.toUpperCase()}) para ${backend.name}`}
            className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
          >
            <ExternalLinkIcon />
            <span>Workload GKE</span>
          </a>
          <a
            href={buildGcpLogsExplorerUrl(gcpTarget)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Abrir logs de ${target.workload} (${env.toUpperCase()}) en Cloud Logging`}
            aria-label={`Logs GCP (${env.toUpperCase()}) para ${backend.name}`}
            className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
          >
            <ExternalLinkIcon />
            <span>Logs GCP</span>
          </a>
        </div>
      )}
    </section>
  );
};

export const BackendComparisonCard = ({
  backend,
  canViewProd,
  testSnapshot,
  prodSnapshot,
  onRefreshEnv,
  onQuickLogs,
  onOpenInLogs,
  onRequestAuth,
  onEdit,
  onDelete,
}: BackendComparisonCardProps) => {
  return (
    <article
      style={{ boxShadow: "var(--elevation-card)" }}
      className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-3.5 sm:p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default)]/70 pb-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-[var(--text-body)]">
            {backend.name}
          </h2>
          {backend.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
          {backend.description && (
            <span className="hidden truncate text-xs text-[var(--text-muted)] lg:inline">
              &mdash; {backend.description}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label={`Editar ${backend.name}`}
            onClick={() => onEdit(backend)}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Editar
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${backend.name}`}
            onClick={() => onDelete(backend)}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--state-error)]/35 bg-[var(--alert-error-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--alert-error-fg)] transition hover:opacity-90"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BackendEnvColumn
          backend={backend}
          env="test"
          target={backend.testTarget}
          canViewProd={canViewProd}
          snapshot={testSnapshot}
          onRefreshEnv={onRefreshEnv}
          onQuickLogs={onQuickLogs}
          onOpenInLogs={onOpenInLogs}
          onRequestAuth={onRequestAuth}
          onEdit={onEdit}
        />
        <BackendEnvColumn
          backend={backend}
          env="prod"
          target={backend.prodTarget}
          canViewProd={canViewProd}
          snapshot={prodSnapshot}
          onRefreshEnv={onRefreshEnv}
          onQuickLogs={onQuickLogs}
          onOpenInLogs={onOpenInLogs}
          onRequestAuth={onRequestAuth}
          onEdit={onEdit}
        />
      </div>
    </article>
  );
};
