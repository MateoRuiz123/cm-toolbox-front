import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAccess } from "@/shared/auth/use-access";
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

const telemetryKey = (backendId: string, env: LogEnvironment): string =>
  `${backendId}|${env}`;

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
  const [layoutMode, setLayoutMode] = useState<"wide" | "compact">("wide");
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

  const filteredBackends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return backends;
    return backends.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)) ||
        b.testTarget?.workload.toLowerCase().includes(q) ||
        b.prodTarget?.workload.toLowerCase().includes(q),
    );
  }, [backends, searchQuery]);

  const kpiSummary = useMemo(() => {
    let healthyEnvs = 0;
    let alertEnvs = 0;
    for (const b of backends) {
      for (const env of ["test", "prod"] as const) {
        const snap = snapshots[telemetryKey(b.id, env)];
        if (!snap?.data) continue;
        if (snap.data.status === "healthy") healthyEnvs += 1;
        else alertEnvs += 1;
      }
    }
    return {
      totalBackends: backends.length,
      healthyEnvs,
      alertEnvs,
    };
  }, [backends, snapshots]);

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
            Compara Test y Producción lado a lado: pods Ready, reinicios, CPU/RAM,
            RPM/errores HTTP y acceso directo a GKE / Logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      <section
        aria-label="Resumen y filtros de backends"
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 font-semibold text-[var(--text-body)]">
            Servicios:
            <strong className="font-mono">{kpiSummary.totalBackends}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--state-success)]/35 bg-[var(--alert-success-bg)] px-2.5 py-1 font-semibold text-[var(--alert-success-fg)]">
            Operativos:
            <strong className="font-mono">{kpiSummary.healthyEnvs}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--state-warning)]/35 bg-[var(--alert-warning-bg)] px-2.5 py-1 font-semibold text-[var(--alert-warning-fg)]">
            Con alerta:
            <strong className="font-mono">{kpiSummary.alertEnvs}</strong>
          </span>
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
              : "No hay coincidencias con tu filtro"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
            {backends.length === 0
              ? "Añade manualmente tus microservicios de Test y Producción o impórtalos en 1 clic desde tus favoritos de Logs."
              : "Prueba con otro término de búsqueda."}
          </p>
          {backends.length === 0 && (
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
