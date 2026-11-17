import { useState } from "react";
import type { LogEnvironment } from "../logs/api/logs-types";
import { BackendEnvMetricsSkeleton } from "./backend-skeleton";
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

const ChevronIcon = ({ rotated }: { readonly rotated: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={`size-3.5 shrink-0 transition-transform ${rotated ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
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

const isScaledZeroTelemetry = (telemetry?: WorkloadTelemetryData): boolean =>
  Boolean(
    telemetry &&
      telemetry.desiredReplicas === 0 &&
      telemetry.readyReplicas === 0,
  );

const computeUsagePercent = (
  used: number | null,
  limit: number | null | undefined,
): number | null => {
  if (used === null || !limit || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
};

const resolveEnvBorderStripe = (
  target: BackendEnvTarget | null,
  isProdBlocked: boolean,
  snapshot?: BackendEnvSnapshot,
): string => {
  if (isProdBlocked || !target) return "border-l-[var(--border-default)]";
  if (snapshot?.requiresAuth) return "border-l-[var(--state-warning)]";
  if (snapshot?.error) return "border-l-[var(--state-error)]";
  const telemetry = snapshot?.data;
  if (!telemetry) return "border-l-[var(--border-default)]";
  if (isScaledZeroTelemetry(telemetry)) {
    return "border-l-[var(--text-muted)]/45";
  }
  if (telemetry.status === "healthy") return "border-l-[var(--state-success)]";
  if (telemetry.status === "degraded") return "border-l-[var(--state-warning)]";
  return "border-l-[var(--state-error)]";
};

const renderEnvStatusBadge = (
  target: BackendEnvTarget | null,
  env: LogEnvironment,
  canViewProd: boolean,
  snapshot?: BackendEnvSnapshot,
) => {
  if (env === "prod" && !canViewProd) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
        Sin permiso Prod
      </span>
    );
  }
  if (!target) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
        No configurado
      </span>
    );
  }
  if (snapshot?.loading && !snapshot.data) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
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
  const telemetry = snapshot?.data;
  if (isScaledZeroTelemetry(telemetry)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
        <span className="size-1.5 rounded-full bg-[var(--text-muted)]" />
        Escalado 0/0
      </span>
    );
  }
  const status = telemetry?.status;
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
    <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
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
  const [podsExpanded, setPodsExpanded] = useState(false);

  const isProdBlocked = env === "prod" && !canViewProd;
  const telemetry = snapshot?.data;
  const scaledZero = isScaledZeroTelemetry(telemetry);
  const gcpTarget = target
    ? {
        workload: target.workload,
        namespace: target.namespace,
        cluster: target.cluster,
        env,
      }
    : null;

  const cpuPct = telemetry
    ? computeUsagePercent(
        telemetry.totalCpuMillicores,
        telemetry.cpuLimitMillicores,
      )
    : null;
  const memPct = telemetry
    ? computeUsagePercent(
        telemetry.totalMemoryMiB,
        telemetry.memoryLimitMiB,
      )
    : null;
  const maxPct =
    cpuPct !== null || memPct !== null
      ? Math.max(cpuPct ?? 0, memPct ?? 0)
      : null;

  const progressBarTone =
    maxPct === null
      ? "bg-[var(--color-primary)]"
      : maxPct >= 90
        ? "bg-[var(--state-error)]"
        : maxPct >= 70
          ? "bg-[var(--state-warning)]"
          : "bg-[var(--state-success)]";

  const podWithIssue = telemetry?.pods.find((p) => Boolean(p.issueReason));
  const activeIssueTitle = !scaledZero
    ? (podWithIssue?.issueReason ??
      (telemetry?.issueSummary &&
      telemetry.issueSummary !== "Escalado a 0 réplicas (0/0)"
        ? telemetry.issueSummary
        : null))
    : null;
  const activeIssueDetail = !scaledZero
    ? (podWithIssue?.issueMessage ?? telemetry?.traffic.lastErrorMessage ?? null)
    : null;

  const hasHttpRequests = (telemetry?.traffic.totalRequests ?? 0) > 0;
  const hasStdoutLogs = (telemetry?.traffic.logLinesCount ?? 0) > 0;

  return (
    <section
      aria-label={`${backend.name} en ${env === "prod" ? "Producción" : "Test"}`}
      className={`flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--border-default)] border-l-4 ${resolveEnvBorderStripe(target, isProdBlocked, snapshot)} bg-[var(--surface-sunken)]/55 p-3.5`}
    >
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
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
              className="shrink-0 cursor-pointer rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-60"
            >
              {snapshot?.loading ? "..." : "Refrescar"}
            </button>
          )}
        </div>

        {isProdBlocked ? (
          <p className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2.5 text-center text-[11px] text-[var(--text-muted)]">
            Tu rol no tiene permiso{" "}
            <span className="font-mono">logs:view_prod</span> para Producción.
          </p>
        ) : !target ? (
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-1)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)]/60 px-3 py-2.5">
            <p className="text-[11px] text-[var(--text-muted)]">
              Sin workload asignado en{" "}
              {env === "prod" ? "Producción" : "Test"}.
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
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-[var(--radius-1)] border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2.5 py-1.5 text-[11px] text-[var(--alert-warning-fg)]">
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
              <div className="mb-2.5 rounded-[var(--radius-1)] border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-2.5 py-1.5 text-[11px] text-[var(--alert-error-fg)]">
                {snapshot.error}
              </div>
            )}

            {!telemetry &&
              !snapshot?.error &&
              !snapshot?.requiresAuth &&
              (!snapshot || snapshot.loading) && <BackendEnvMetricsSkeleton />}

            {telemetry && scaledZero && (
              <div className="mb-2.5 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)]">
                Deployment apagado intencionalmente (0 réplicas configuradas).
              </div>
            )}

            {telemetry && (activeIssueTitle || activeIssueDetail) && (
              <div
                className={`mb-2.5 rounded-[var(--radius-1)] border px-2.5 py-1.5 text-[11px] ${
                  telemetry.status === "offline"
                    ? "border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] text-[var(--alert-error-fg)]"
                    : "border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] text-[var(--alert-warning-fg)]"
                }`}
              >
                {activeIssueTitle && (
                  <span className="font-bold">{activeIssueTitle}</span>
                )}
                {activeIssueTitle && activeIssueDetail && <span> — </span>}
                {activeIssueDetail && (
                  <span className="font-normal">{activeIssueDetail}</span>
                )}
              </div>
            )}

            {telemetry && (
              <div className="grid grid-cols-1 divide-y divide-[var(--border-default)]/60 rounded-[var(--radius-2)] border border-[var(--border-default)]/70 bg-[var(--surface-card)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-3 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Pods y salud
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-bold tabular-nums text-[var(--text-body)]">
                    {telemetry.readyReplicas}/{telemetry.desiredReplicas} Ready
                  </span>
                  <span
                    className={`mt-0.5 block text-[11px] ${
                      telemetry.totalRestarts > 0
                        ? "font-semibold text-[var(--alert-warning-fg)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {telemetry.totalRestarts > 0
                      ? `${telemetry.totalRestarts} ${
                          telemetry.totalRestarts === 1 ? "reinicio" : "reinicios"
                        }`
                      : scaledZero
                        ? "Sin réplicas activas"
                        : "Estable · 0 reinicios"}
                  </span>
                </div>

                <div className="px-3 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    CPU / Memoria
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-bold tabular-nums text-[var(--text-body)]">
                    {telemetry.totalCpuMillicores !== null
                      ? `${telemetry.totalCpuMillicores}m`
                      : "—"}
                    {" / "}
                    {telemetry.totalMemoryMiB !== null
                      ? `${telemetry.totalMemoryMiB}Mi`
                      : "—"}
                  </span>
                  {maxPct !== null ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className={`h-full rounded-full transition-all ${progressBarTone}`}
                          style={{ width: `${Math.max(4, maxPct)}%` }}
                        />
                      </div>
                      <span className="block font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                        CPU {cpuPct ?? "—"}% &bull; RAM {memPct ?? "—"}% límite
                      </span>
                    </div>
                  ) : (
                    <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                      {telemetry.pods.length} pod(s)
                    </span>
                  )}
                </div>

                <div className="px-3 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Actividad ({telemetry.traffic.windowMinutes}m)
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-bold tabular-nums text-[var(--text-body)]">
                    {hasHttpRequests
                      ? `${telemetry.traffic.rpm} req/m`
                      : hasStdoutLogs
                        ? `${telemetry.traffic.logsPerMinute ?? 0} logs/m`
                        : "0 req/m"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                    {hasHttpRequests ? (
                      <>
                        4xx: {telemetry.traffic.rate4xxPercent}% &bull;{" "}
                        <span
                          className={
                            telemetry.traffic.rate5xxPercent > 0
                              ? "font-semibold text-[var(--alert-error-fg)]"
                              : ""
                          }
                        >
                          5xx: {telemetry.traffic.rate5xxPercent}%
                        </span>
                      </>
                    ) : hasStdoutLogs ? (
                      <>
                        Actividad stdout &bull;{" "}
                        <span
                          className={
                            (telemetry.traffic.errorLinesCount ?? 0) > 0
                              ? "font-semibold text-[var(--alert-warning-fg)]"
                              : ""
                          }
                        >
                          {telemetry.traffic.errorLinesCount ?? 0} err
                        </span>
                      </>
                    ) : (
                      "Sin actividad en 5m"
                    )}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--text-muted)]">
                    {telemetry.imageTag ? `:${telemetry.imageTag} · ` : ""}
                    Deploy {formatRelativeAge(telemetry.deployedAt)}
                    {telemetry.httpHealthStatus
                      ? ` · Health ${telemetry.httpHealthStatus.toUpperCase()}${
                          telemetry.httpLatencyMs
                            ? ` (${telemetry.httpLatencyMs}ms)`
                            : ""
                        }`
                      : ""}
                  </span>
                </div>
              </div>
            )}

            {telemetry && telemetry.pods.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  aria-expanded={podsExpanded}
                  onClick={() => setPodsExpanded((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <ChevronIcon rotated={podsExpanded} />
                  <span>
                    {podsExpanded ? "Ocultar" : "Ver"} pods ({telemetry.pods.length})
                  </span>
                </button>

                {podsExpanded && (
                  <div className="mt-1.5 divide-y divide-[var(--border-default)]/50 rounded-[var(--radius-1)] border border-[var(--border-default)]/70 bg-[var(--surface-card)]">
                    {telemetry.pods.map((pod) => (
                      <div
                        key={pod.name}
                        className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              pod.ready
                                ? "bg-[var(--state-success)]"
                                : "bg-[var(--state-error)]"
                            }`}
                          />
                          <span className="truncate font-mono text-[var(--text-body)]">
                            {pod.name}
                          </span>
                          {pod.issueReason && (
                            <span className="rounded bg-[var(--alert-error-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--alert-error-fg)]">
                              {pod.issueReason}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                          <span>{pod.phase}</span>
                          <span>{pod.restarts} rein.</span>
                          <span>
                            {pod.cpuMillicores !== null
                              ? `${pod.cpuMillicores}m`
                              : "—"}
                            {" / "}
                            {pod.memoryMiB !== null ? `${pod.memoryMiB}Mi` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {target && gcpTarget && !isProdBlocked && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border-default)]/70 pt-2.5">
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

const resolveServiceDotClass = (
  canViewProd: boolean,
  testSnapshot?: BackendEnvSnapshot,
  prodSnapshot?: BackendEnvSnapshot,
): string => {
  const active = [
    testSnapshot,
    canViewProd ? prodSnapshot : undefined,
  ].filter((s): s is BackendEnvSnapshot => Boolean(s));

  const hasOffline = active.some(
    (s) =>
      s.error ||
      (s.data?.status === "offline" && !isScaledZeroTelemetry(s.data)),
  );
  if (hasOffline) return "bg-[var(--state-error)]";

  const hasWarning = active.some(
    (s) => s.requiresAuth || s.data?.status === "degraded",
  );
  if (hasWarning) return "bg-[var(--state-warning)]";

  const hasHealthy = active.some((s) => s.data?.status === "healthy");
  if (hasHealthy) return "bg-[var(--state-success)]";

  return "bg-[var(--text-muted)]/50";
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
  const testTag = testSnapshot?.data?.imageTag ?? null;
  const prodTag = canViewProd ? (prodSnapshot?.data?.imageTag ?? null) : null;
  const hasBothTags = Boolean(testTag && prodTag);
  const versionDrift = hasBothTags && testTag !== prodTag;
  const versionSynced = hasBothTags && testTag === prodTag;

  return (
    <article
      style={{ boxShadow: "var(--elevation-card)" }}
      className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default)]/70 pb-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${resolveServiceDotClass(
              canViewProd,
              testSnapshot,
              prodSnapshot,
            )}`}
          />
          <h2 className="text-base font-bold tracking-tight text-[var(--text-body)]">
            {backend.name}
          </h2>

          {versionDrift && (
            <span className="inline-flex items-center rounded-full border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[var(--alert-warning-fg)]">
              Diferente versión: Test :{testTag} ≠ Prod :{prodTag}
            </span>
          )}

          {versionSynced && (
            <span className="inline-flex items-center rounded-full border border-[var(--state-success)]/35 bg-[var(--alert-success-bg)] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--alert-success-fg)]">
              Versión sincronizada :{prodTag}
            </span>
          )}

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
