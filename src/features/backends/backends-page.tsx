import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAccess } from "@/shared/auth/use-access";
import { safeStorage } from "@/shared/lib/safe-storage";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import type { LogEnvironment } from "../logs/api/logs-types";
import { GcloudLoginModal } from "../logs/gcloud-login-modal";
import {
  guardarLogsSesion,
  idWorkload,
  registrarLogReciente,
} from "../logs/logs-sesion";
import { AddBackendModal } from "./add-backend-modal";
import {
  deleteUserBackend,
  fetchBackendEnvTelemetry,
  fetchUserBackends,
  importFromLogsFavorites,
  TelemetryAuthError,
  upsertUserBackend,
  type BackendEnvTarget,
  type UserBackendItem,
} from "./api/backends-api";
import {
  BackendComparisonCard,
  type BackendEnvSnapshot,
} from "./backend-comparison-card";
import { QuickLogsDrawer } from "./quick-logs-drawer";

const GUIDE_STORAGE_KEY = "cm-toolbox:backends-guide-hidden";

type BackendStatusFilter = "all" | "alert" | "healthy" | "drift";
type AutoRefreshSeconds = 0 | 30 | 60;

const telemetryKey = (backendId: string, env: LogEnvironment): string =>
  `${backendId}|${env}`;

const isScaledZeroSnapshot = (snap?: BackendEnvSnapshot): boolean =>
  Boolean(
    snap?.data &&
      snap.data.desiredReplicas === 0 &&
      snap.data.readyReplicas === 0,
  );

const classifyBackend = (
  backend: UserBackendItem,
  snapshots: Readonly<Record<string, BackendEnvSnapshot>>,
  canViewProd: boolean,
) => {
  const testSnap = backend.testTarget
    ? snapshots[telemetryKey(backend.id, "test")]
    : undefined;
  const prodSnap =
    backend.prodTarget && canViewProd
      ? snapshots[telemetryKey(backend.id, "prod")]
      : undefined;

  const activeSnaps = [testSnap, prodSnap].filter((s): s is BackendEnvSnapshot =>
    Boolean(s),
  );

  const hasAlert = activeSnaps.some(
    (s) =>
      Boolean(s.requiresAuth) ||
      Boolean(s.error) ||
      s.data?.status === "degraded" ||
      (s.data?.status === "offline" && !isScaledZeroSnapshot(s)),
  );

  const hasHealthy =
    !hasAlert && activeSnaps.some((s) => s.data?.status === "healthy");

  const testTag = testSnap?.data?.imageTag ?? null;
  const prodTag = prodSnap?.data?.imageTag ?? null;
  const hasVersionDrift = Boolean(testTag && prodTag && testTag !== prodTag);

  return { hasAlert, hasHealthy, hasVersionDrift };
};

export const BackendsPage = () => {
  const navigate = useNavigate();
  const { profile, canPerformAction } = useAccess();
  const userEmail = profile.email;
  const canViewProd = canPerformAction("logs", "view_prod");

  const [backends, setBackends] = useState<UserBackendItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [snapshots, setSnapshots] = useState<
    Record<string, BackendEnvSnapshot>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BackendStatusFilter>("all");
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(0);
  const [layoutMode, setLayoutMode] = useState<"wide" | "compact">("wide");
  const [showGuide, setShowGuide] = useState(
    () => safeStorage.getItem(GUIDE_STORAGE_KEY) !== "1",
  );
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBackend, setEditingBackend] = useState<UserBackendItem | null>(
    null,
  );
  const [drawerState, setDrawerState] = useState<{
    readonly backendName: string;
    readonly env: LogEnvironment;
    readonly target: BackendEnvTarget;
  } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const loadEnvMetrics = useCallback(
    async (
      backendId: string,
      env: LogEnvironment,
      target: BackendEnvTarget,
      force = false,
    ) => {
      if (env === "prod" && !canViewProd) return;
      const key = telemetryKey(backendId, env);
      setSnapshots((prev) => ({
        ...prev,
        [key]: { ...prev[key], loading: true, error: undefined },
      }));

      try {
        const data = await fetchBackendEnvTelemetry(env, target, force);
        setSnapshots((prev) => ({
          ...prev,
          [key]: { data, loading: false, requiresAuth: false },
        }));
      } catch (err) {
        if (err instanceof TelemetryAuthError) {
          setSnapshots((prev) => ({
            ...prev,
            [key]: {
              ...prev[key],
              loading: false,
              requiresAuth: true,
              error: err.message,
            },
          }));
          return;
        }
        setSnapshots((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            requiresAuth: false,
            error:
              err instanceof Error
                ? err.message
                : "No se pudo consultar la telemetría.",
          },
        }));
      }
    },
    [canViewProd],
  );

  const refreshAllMetrics = useCallback(
    async (items: readonly UserBackendItem[], force = false) => {
      const jobs: Array<Promise<void>> = [];
      for (const item of items) {
        if (item.testTarget) {
          jobs.push(loadEnvMetrics(item.id, "test", item.testTarget, force));
        }
        if (item.prodTarget && canViewProd) {
          jobs.push(loadEnvMetrics(item.id, "prod", item.prodTarget, force));
        }
      }
      await Promise.allSettled(jobs);
    },
    [canViewProd, loadEnvMetrics],
  );

  useEffect(() => {
    let active = true;
    const init = async () => {
      const items = await fetchUserBackends(userEmail);
      if (!active) return;
      setBackends(items);
      setLoadingList(false);
      await refreshAllMetrics(items, false);
    };
    void init();
    return () => {
      active = false;
    };
  }, [userEmail, refreshAllMetrics]);

  useEffect(() => {
    if (autoRefreshSec === 0 || backends.length === 0) return;
    const intervalId = window.setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void refreshAllMetrics(backends, false);
    }, autoRefreshSec * 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefreshSec, backends, refreshAllMetrics]);

  const handleToggleGuide = (visible: boolean) => {
    safeStorage.setItem(GUIDE_STORAGE_KEY, visible ? "0" : "1");
    setShowGuide(visible);
  };

  const handleSaveBackend = async (item: UserBackendItem) => {
    const saved = await upsertUserBackend(item, userEmail);
    setBackends((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      return exists
        ? prev.map((b) => (b.id === saved.id ? saved : b))
        : [...prev, saved];
    });
    void refreshAllMetrics([saved], true);
  };

  const handleDeleteBackend = async (backend: UserBackendItem) => {
    setBackends((prev) => prev.filter((b) => b.id !== backend.id));
    await deleteUserBackend(backend.id, userEmail);
  };

  const handleImportFavorites = async () => {
    setBannerMessage(null);
    const result = await importFromLogsFavorites(userEmail, backends);
    setBackends(result.items);
    if (result.addedCount === 0) {
      setBannerMessage(
        "No se encontraron favoritos o recientes nuevos en Logs GKE para importar.",
      );
      return;
    }
    setBannerMessage(
      `Se importaron o actualizaron ${result.addedCount} backend(s) desde tus favoritos/recientes de Logs.`,
    );
    await refreshAllMetrics(result.items, false);
  };

  const handleOpenInLogs = (env: LogEnvironment, target: BackendEnvTarget) => {
    const nsKey = `${target.cluster}|${target.namespace}`;
    const wlKey = idWorkload(target.cluster, target.namespace, target.workload);
    guardarLogsSesion({ env, namespace: nsKey, workload: wlKey });
    registrarLogReciente(
      {
        env,
        namespace: nsKey,
        workload: wlKey,
        cluster: target.cluster,
        namespaceName: target.namespace,
        workloadName: target.workload,
      },
      userEmail,
    );
    navigate("/logs");
  };

  const backendStatusMap = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof classifyBackend>
    >();
    for (const backend of backends) {
      map.set(backend.id, classifyBackend(backend, snapshots, canViewProd));
    }
    return map;
  }, [backends, snapshots, canViewProd]);

  const filteredBackends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return backends.filter((b) => {
      const cls = backendStatusMap.get(b.id);
      if (statusFilter === "alert" && !cls?.hasAlert) return false;
      if (statusFilter === "healthy" && !cls?.hasHealthy) return false;
      if (statusFilter === "drift" && !cls?.hasVersionDrift) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)) ||
        b.testTarget?.workload.toLowerCase().includes(q) ||
        b.prodTarget?.workload.toLowerCase().includes(q)
      );
    });
  }, [backends, backendStatusMap, statusFilter, searchQuery]);

  const kpiSummary = useMemo(() => {
    let healthyBackends = 0;
    let alertBackends = 0;
    let driftBackends = 0;
    for (const cls of backendStatusMap.values()) {
      if (cls.hasAlert) alertBackends += 1;
      if (cls.hasHealthy) healthyBackends += 1;
      if (cls.hasVersionDrift) driftBackends += 1;
    }
    return {
      totalBackends: backends.length,
      healthyBackends,
      alertBackends,
      driftBackends,
    };
  }, [backends.length, backendStatusMap]);

  const needsAnyAuth = useMemo(
    () => Object.values(snapshots).some((s) => s.requiresAuth),
    [snapshots],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="mb-4 flex flex-col gap-3 border-b border-[var(--border-default)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Catálogo Personal GKE
          </div>

          <SmoothTitleAccent
            as="h1"
            className="text-2xl font-extrabold tracking-tight text-[var(--text-body)] sm:text-3xl"
            accessibleTitle="Mis Backends"
            before="Mis "
            accent="Backends"
            amplitude={3}
          />

          <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
            Compara Test y Producción lado a lado: estado de réplicas, paridad de
            versión, recursos, actividad y acceso directo a logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={showGuide}
            onClick={() => handleToggleGuide(!showGuide)}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Guía rápida
          </button>
          <button
            type="button"
            onClick={() => void handleImportFavorites()}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Importar favoritos de Logs
          </button>
          <button
            type="button"
            onClick={() => void refreshAllMetrics(backends, true)}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Actualizar métricas
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingBackend(null);
              setModalOpen(true);
            }}
            className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-1.5 text-xs font-bold text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)]"
          >
            + Añadir backend
          </button>
        </div>
      </header>

      {showGuide && (
        <section
          aria-label="¿Cómo leer este tablero?"
          className="mb-4 rounded-[var(--radius-2)] border border-[var(--color-primary)]/25 bg-[var(--surface-card)] px-4 py-3.5"
        >
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              ¿Cómo leer este tablero?
            </h2>
            <button
              type="button"
              onClick={() => handleToggleGuide(false)}
              className="cursor-pointer text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-body)] hover:underline"
            >
              Entendido, ocultar guía
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 divide-y divide-[var(--border-default)]/60 text-xs md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="pt-2 md:pt-0 md:pr-3">
              <p className="font-bold text-[var(--text-body)]">
                1. Semáforo por ambiente
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                La barra lateral indica al instante si un ambiente está Operativo
                (verde), Degradado (ámbar), Sin pods (rojo) o Escalado 0/0 (apagado).
              </p>
            </div>
            <div className="pt-2 md:px-3 md:pt-0">
              <p className="font-bold text-[var(--text-body)]">
                2. Versión Test vs Prod
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                En la cabecera verás la etiqueta de imagen desplegada y un aviso
                automático si Test y Producción tienen distinta versión.
              </p>
            </div>
            <div className="pt-2 md:pl-3 md:pt-0">
              <p className="font-bold text-[var(--text-body)]">
                3. Logs en vivo y pods a 1 clic
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                Despliega <strong>Ver pods</strong> si hay fallos o reinicios, o
                abre <strong>Vista rápida de logs</strong> sin abandonar la página.
              </p>
            </div>
          </div>
        </section>
      )}

      <section
        aria-label="Resumen y filtros de backends"
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5"
      >
        <div
          role="group"
          aria-label="Filtrar por estado"
          className="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <button
            type="button"
            aria-pressed={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            className={`cursor-pointer rounded-full border px-3 py-1 font-semibold transition ${
              statusFilter === "all"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                : "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-body)] hover:border-[var(--color-primary)]/50"
            }`}
          >
            Todos (<span className="font-mono">{kpiSummary.totalBackends}</span>)
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "alert"}
            onClick={() =>
              setStatusFilter((prev) => (prev === "alert" ? "all" : "alert"))
            }
            className={`cursor-pointer rounded-full border px-3 py-1 font-semibold transition ${
              statusFilter === "alert"
                ? "border-[var(--state-warning)] bg-[var(--state-warning)] text-white"
                : "border-[var(--state-warning)]/35 bg-[var(--alert-warning-bg)] text-[var(--alert-warning-fg)] hover:opacity-90"
            }`}
          >
            Con alerta (
            <span className="font-mono">{kpiSummary.alertBackends}</span>)
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "healthy"}
            onClick={() =>
              setStatusFilter((prev) =>
                prev === "healthy" ? "all" : "healthy",
              )
            }
            className={`cursor-pointer rounded-full border px-3 py-1 font-semibold transition ${
              statusFilter === "healthy"
                ? "border-[var(--state-success)] bg-[var(--state-success)] text-white"
                : "border-[var(--state-success)]/35 bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)] hover:opacity-90"
            }`}
          >
            Operativos (
            <span className="font-mono">{kpiSummary.healthyBackends}</span>)
          </button>

          {kpiSummary.driftBackends > 0 && (
            <button
              type="button"
              aria-pressed={statusFilter === "drift"}
              onClick={() =>
                setStatusFilter((prev) => (prev === "drift" ? "all" : "drift"))
              }
              className={`cursor-pointer rounded-full border px-3 py-1 font-semibold transition ${
                statusFilter === "drift"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:opacity-90"
              }`}
            >
              Diferente versión (
              <span className="font-mono">{kpiSummary.driftBackends}</span>)
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {backends.length > 0 && (
            <input
              type="search"
              aria-label="Filtrar tus backends"
              placeholder="Filtrar por nombre, workload o etiqueta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xs rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3.5 py-1.5 text-xs text-[var(--text-body)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
            />
          )}

          <div
            role="group"
            aria-label="Auto-actualización"
            className="inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-0.5"
          >
            <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Auto
            </span>
            {([
              { label: "Manual", value: 0 },
              { label: "30s", value: 30 },
              { label: "60s", value: 60 },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={autoRefreshSec === option.value}
                onClick={() => setAutoRefreshSec(option.value)}
                className={`cursor-pointer rounded-[var(--radius-pill)] px-2 py-1 text-[11px] font-semibold transition ${
                  autoRefreshSec === option.value
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Densidad de tarjetas"
            className="hidden items-center rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-0.5 xl:inline-flex"
          >
            <button
              type="button"
              aria-pressed={layoutMode === "wide"}
              onClick={() => setLayoutMode("wide")}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold transition ${
                layoutMode === "wide"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              Lista
            </button>
            <button
              type="button"
              aria-pressed={layoutMode === "compact"}
              onClick={() => setLayoutMode("compact")}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold transition ${
                layoutMode === "compact"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              2 columnas
            </button>
          </div>
        </div>
      </section>

      {needsAnyAuth && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-2)] border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-4 py-2.5 text-xs text-[var(--alert-warning-fg)]">
          <span>
            Algunas métricas GKE requieren iniciar sesión con Google Cloud CLI (`gcloud`).
          </span>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--state-warning)] px-3.5 py-1 text-xs font-bold text-white"
          >
            Autenticar GKE
          </button>
        </div>
      )}

      {bannerMessage && (
        <div
          role="status"
          className="mb-4 rounded-[var(--radius-2)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-medium text-[var(--color-primary)]"
        >
          {bannerMessage}
        </div>
      )}

      {loadingList ? (
        <div
          role="status"
          className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center text-sm text-[var(--text-muted)]"
        >
          Cargando catálogo personal de backends...
        </div>
      ) : filteredBackends.length === 0 ? (
        <div className="rounded-[var(--radius-3)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-10 text-center">
          <h2 className="text-lg font-bold text-[var(--text-body)]">
            {backends.length === 0
              ? "Aún no tienes backends registrados"
              : "No hay coincidencias con tus filtros"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
            {backends.length === 0
              ? "Añade manualmente tus microservicios de Test y Producción o impórtalos en 1 clic desde tus favoritos de Logs."
              : "Prueba con otro término o limpia el filtro de estado."}
          </p>
          {backends.length === 0 ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingBackend(null);
                  setModalOpen(true);
                }}
                className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2.5 text-xs font-bold text-[var(--color-action-contrast)]"
              >
                + Añadir primer backend
              </button>
              <button
                type="button"
                onClick={() => void handleImportFavorites()}
                className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-semibold text-[var(--text-body)]"
              >
                Importar favoritos de Logs
              </button>
            </div>
          ) : (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2 text-xs font-semibold text-[var(--text-body)]"
              >
                Ver todos los backends
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`grid gap-3.5 ${
            layoutMode === "compact" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {filteredBackends.map((backend) => (
            <BackendComparisonCard
              key={backend.id}
              backend={backend}
              canViewProd={canViewProd}
              testSnapshot={snapshots[telemetryKey(backend.id, "test")]}
              prodSnapshot={snapshots[telemetryKey(backend.id, "prod")]}
              onRefreshEnv={(item, env) => {
                const target = env === "prod" ? item.prodTarget : item.testTarget;
                if (target) {
                  void loadEnvMetrics(item.id, env, target, true);
                }
              }}
              onQuickLogs={(item, env, target) =>
                setDrawerState({ backendName: item.name, env, target })
              }
              onOpenInLogs={handleOpenInLogs}
              onRequestAuth={() => setAuthModalOpen(true)}
              onEdit={(item) => {
                setEditingBackend(item);
                setModalOpen(true);
              }}
              onDelete={(item) => void handleDeleteBackend(item)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddBackendModal
          initialBackend={editingBackend}
          canViewProd={canViewProd}
          defaultOrder={(backends.length + 1) * 10}
          userEmail={userEmail}
          suspendEscape={authModalOpen}
          onRequestGcloudAuth={() => setAuthModalOpen(true)}
          onSave={handleSaveBackend}
          onClose={() => {
            setModalOpen(false);
            setEditingBackend(null);
          }}
        />
      )}

      {drawerState && (
        <QuickLogsDrawer
          backendName={drawerState.backendName}
          env={drawerState.env}
          target={drawerState.target}
          onOpenFullLogs={handleOpenInLogs}
          onClose={() => setDrawerState(null)}
        />
      )}

      <GcloudLoginModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          void refreshAllMetrics(backends, true);
        }}
      />
    </div>
  );
};
