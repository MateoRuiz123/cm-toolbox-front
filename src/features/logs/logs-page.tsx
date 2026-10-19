import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { SmoothLinkScramble, SmoothTitleAccent } from "@/shared/ui/smoothui";
import { useAccess } from "../../shared/auth/access-context";
import {
  authCluster,
  fetchNamespaces,
  fetchWorkloads,
  logoutGcloudSession,
  createLogsWebSocket,
  authenticateLogsWebSocket,
  parseLogStreamMessage,
  isGcloudAuthRequired,
} from "./api/logs-api";
import type {
  LogEnvironment,
  LogStreamMessage,
  WorkloadInfo,
} from "./api/logs-types";
import { LogsViewer, type LogsViewerTarget } from "./logs-viewer";
import { GcloudLoginModal } from "./gcloud-login-modal";
import { WorkloadCombobox } from "./workload-combobox";
import { appendBoundedLog } from "./logs-buffer";
import { guardarLogsSesion, idWorkload, leerLogsSesion } from "./logs-sesion";

const FormErrorIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="mt-0.5 size-4 shrink-0 text-[var(--state-error)]"
    fill="none"
    stroke="currentColor"
  >
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <line
      x1="12"
      y1="8"
      x2="12"
      y2="12"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="16"
      x2="12.01"
      y2="16"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const LogsPage = () => {
  const { canPerformAction } = useAccess();
  const canViewProd = canPerformAction("logs", "view_prod");
  const [sesionGuardada] = useState(leerLogsSesion);
  const sesionAplicable =
    sesionGuardada && !(sesionGuardada.env === "prod" && !canViewProd)
      ? sesionGuardada
      : null;
  const restauracionRef = useRef(sesionAplicable);
  const [env, setEnv] = useState<LogEnvironment | null>(
    () => sesionAplicable?.env ?? null,
  );
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [workloads, setWorkloads] = useState<WorkloadInfo[]>([]);
  const [search, setSearch] = useState("");
  const [selectedWorkload, setSelectedWorkload] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [logs, setLogs] = useState<LogStreamMessage[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [gcloudAuthRequired, setGcloudAuthRequired] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingWorkloads, setLoadingWorkloads] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [streamTarget, setStreamTarget] = useState<LogsViewerTarget | null>(
    null,
  );
  const wsRef = useRef<WebSocket | null>(null);

  const handleStop = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "stop" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const loadCatalogForEnv = useCallback(async (selectedEnv: LogEnvironment) => {
    if (
      restauracionRef.current &&
      restauracionRef.current.env !== selectedEnv
    ) {
      restauracionRef.current = null;
    }
    setLoadingCatalog(true);
    setFormError(null);
    setGcloudAuthRequired(false);
    setNamespaces([]);
    setSelectedNamespace("");
    setWorkloads([]);
    setSelectedWorkload("");

    try {
      await authCluster(selectedEnv);
      const ns = await fetchNamespaces(selectedEnv);
      setNamespaces(ns);
      const pendiente = restauracionRef.current;
      if (
        pendiente?.env === selectedEnv &&
        pendiente.namespace &&
        ns.includes(pendiente.namespace)
      ) {
        setSelectedNamespace(pendiente.namespace);
      } else if (pendiente?.env === selectedEnv) {
        restauracionRef.current = null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error autenticando";
      setFormError(message);
      const needsLogin = isGcloudAuthRequired(err);
      setGcloudAuthRequired(needsLogin);
      if (needsLogin) {
        setShowLoginModal(true);
      }
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (!env) return;
    void loadCatalogForEnv(env);
  }, [env, loadCatalogForEnv]);

  useEffect(() => {
    if (!env || !selectedNamespace) return;
    setLoadingWorkloads(true);
    const delay = globalThis.setTimeout(() => {
      fetchWorkloads(env, selectedNamespace, search)
        .then((list) => {
          setWorkloads(list);
          const pendiente = restauracionRef.current;
          if (
            pendiente?.namespace === selectedNamespace &&
            pendiente.workload
          ) {
            const existe = list.some(
              (workload) =>
                idWorkload(
                  workload.cluster,
                  workload.namespace,
                  workload.name,
                ) === pendiente.workload,
            );
            if (existe) setSelectedWorkload(pendiente.workload);
          }
          restauracionRef.current = null;
          setLoadingWorkloads(false);
        })
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : "Error cargando workloads";
          restauracionRef.current = null;
          setFormError(message);
          setLoadingWorkloads(false);
        });
    }, 300);
    return () => {
      globalThis.clearTimeout(delay);
      setLoadingWorkloads(false);
    };
  }, [env, selectedNamespace, search]);

  useEffect(() => () => handleStop(), [handleStop]);

  useEffect(() => {
    if (restauracionRef.current) return;
    guardarLogsSesion(
      env
        ? { env, namespace: selectedNamespace, workload: selectedWorkload }
        : null,
    );
  }, [env, selectedNamespace, selectedWorkload]);

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isStreaming) {
      handleStop();
      return;
    }
    handleStart();
  };

  const handleStart = () => {
    if (!env || !selectedWorkload) return;
    const [cluster, ns, wlName] = selectedWorkload.split("|");
    if (!cluster || !ns || !wlName) return;

    setLogs([]);
    setIsStreaming(true);
    setFormError(null);
    setStreamTarget({ workload: wlName, namespace: ns, cluster, env });

    const ws = createLogsWebSocket();
    wsRef.current = ws;

    ws.onopen = () => {
      authenticateLogsWebSocket(ws);
    };

    ws.onmessage = (event) => {
      const msg = parseLogStreamMessage(String(event.data));
      if (!msg) return;
      if (msg.type === "authenticated") {
        ws.send(
          JSON.stringify({
            action: "start",
            env,
            cluster,
            namespace: ns,
            workload: wlName,
          }),
        );
        return;
      }
      setLogs((prev) => appendBoundedLog(prev, msg));
    };

    ws.onerror = () => {
      setFormError("Error en conexión WebSocket");
      setIsStreaming(false);
    };

    ws.onclose = () => setIsStreaming(false);
  };

  const handleLoginSuccess = useCallback(() => {
    if (env) void loadCatalogForEnv(env);
  }, [env, loadCatalogForEnv]);

  const handleCloseLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const handleRetryAuth = useCallback(() => {
    if (env) void loadCatalogForEnv(env);
  }, [env, loadCatalogForEnv]);

  const handleGcloudLogout = useCallback(async () => {
    setLoggingOut(true);
    setFormError(null);
    try {
      await logoutGcloudSession();
      restauracionRef.current = null;
      guardarLogsSesion(null);
      setEnv(null);
      setNamespaces([]);
      setSelectedNamespace("");
      setWorkloads([]);
      setSelectedWorkload("");
      setLogs([]);
      setStreamTarget(null);
      setGcloudAuthRequired(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cerrar sesión";
      setFormError(message);
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const showViewer = isStreaming || logs.length > 0 || streamTarget !== null;

  return (
    <>
      <div className="mx-auto w-full max-w-[1680px] px-4 pb-6 pt-6 sm:px-8 sm:pt-8 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
        <div className="grid grid-cols-1 items-start gap-6 lg:h-full lg:grid-cols-[400px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:max-h-full lg:overflow-y-auto lg:pr-1">
            <header className="pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                Panel de consulta
              </span>
              <SmoothTitleAccent
                as="h1"
                className="mt-1 text-xl font-bold tracking-tight text-[var(--text-body)] sm:text-2xl"
                accessibleTitle="Visor de Logs en Tiempo Real"
                before="Visor de "
                accent="Logs"
                amplitude={2}
              />
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                Auditoría en tiempo real de clusters GKE de Coordinadora
                Mercantil (Prod y Test).
              </p>
            </header>

            <form
              onSubmit={handleFormSubmit}
              style={{ boxShadow: "var(--shadow-panel)" }}
              className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Parámetros de consulta
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <fieldset className="space-y-2 border-0 p-0">
                  <legend className="text-xs font-bold text-[var(--text-body)]">
                    Ambiente
                  </legend>
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="radiogroup"
                    aria-label="Ambiente GKE"
                  >
                    {(["prod", "test"] as const).map((option) => {
                      const isProd = option === "prod";
                      const isDisabled = isProd && !canViewProd;
                      const selected = env === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={isDisabled}
                          title={
                            isDisabled
                              ? 'Requiere el permiso "Ver logs de Producción" (view_prod).'
                              : undefined
                          }
                          onClick={() => setEnv(option)}
                          className={`rounded-[var(--radius-1)] border px-3 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:cursor-not-allowed disabled:opacity-50 ${
                            selected
                              ? isProd
                                ? "border-[var(--state-error)] bg-[var(--alert-error-bg)] text-[var(--state-error)]"
                                : "border-[var(--state-warning)] bg-[var(--alert-warning-bg)] text-[var(--state-warning)]"
                              : "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-body)] hover:border-[var(--color-primary)]/40"
                          }`}
                        >
                          {isProd ? "Producción" : "Test / QA"}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-body)]">
                      Namespace
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Por cluster
                    </span>
                  </div>
                  <select
                    id="logs-namespace"
                    disabled={!env || loadingCatalog || namespaces.length === 0}
                    value={selectedNamespace}
                    onChange={(e) => {
                      setSelectedNamespace(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    aria-invalid={Boolean(formError)}
                    className={`mt-1.5 w-full rounded-[var(--radius-1)] border bg-[var(--surface-card)] px-3.5 py-2.5 text-sm text-[var(--text-body)] focus:outline-none focus:ring-1 disabled:opacity-50 ${
                      formError
                        ? "border-[var(--state-error)] focus:border-[var(--state-error)] focus:ring-[var(--state-error)]"
                        : "border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    }`}
                  >
                    <option value="">— Seleccionar —</option>
                    <option value="__all__">Todos los namespaces</option>
                    {namespaces.map((ns) => (
                      <option key={ns} value={ns}>
                        {ns.replace("|", " / ")}
                      </option>
                    ))}
                  </select>
                </label>

                <WorkloadCombobox
                  id="logs-workload"
                  label="Carga de trabajo"
                  hint="Resultados en tiempo real"
                  placeholder="Ej. api-gateway"
                  disabled={!selectedNamespace}
                  workloads={workloads}
                  loading={loadingWorkloads}
                  value={selectedWorkload}
                  onSelect={setSelectedWorkload}
                  onSearchChange={setSearch}
                  error={Boolean(formError)}
                  showClusterNamespace={selectedNamespace === "__all__"}
                />
              </div>

              {formError && (
                <div
                  id="logs-form-error"
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-xs leading-relaxed text-[var(--alert-error-fg)]"
                >
                  <FormErrorIcon />
                  <div className="flex flex-col gap-2">
                    <span>{formError}</span>
                    {gcloudAuthRequired ? (
                      <button
                        type="button"
                        onClick={() => setShowLoginModal(true)}
                        className="w-fit text-left font-semibold underline focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      >
                        Renovar credenciales GCP
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRetryAuth}
                        className="w-fit text-left font-semibold underline focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      >
                        Reintentar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  type="submit"
                  disabled={
                    !isStreaming && (!selectedWorkload || loadingCatalog)
                  }
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingCatalog && (
                    <span
                      aria-hidden="true"
                      className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
                    />
                  )}
                  {isStreaming
                    ? "Detener streaming"
                    : loadingCatalog
                      ? "Conectando…"
                      : "Empezar a ver logs"}
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-2 px-1 lg:items-start">
              <p className="text-center text-xs text-[var(--text-muted)] lg:text-left">
                La consulta de logs es una operación de solo lectura.
              </p>
              {env && (
                <button
                  type="button"
                  onClick={handleGcloudLogout}
                  disabled={loggingOut}
                  className="w-fit text-xs font-semibold text-[var(--text-muted)] underline transition hover:text-[var(--state-error)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50"
                >
                  {loggingOut ? "Cerrando sesión GCP…" : "Cerrar sesión GCP"}
                </button>
              )}
            </div>
          </aside>

          <section className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            {showViewer ? (
              <div
                style={{ boxShadow: "var(--shadow-panel)" }}
                className="surface flex h-[70dvh] min-h-[420px] flex-col overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] lg:h-auto lg:min-h-0 lg:flex-1"
              >
                <LogsViewer
                  logs={logs}
                  isStreaming={isStreaming}
                  onClear={() => setLogs([])}
                  target={streamTarget ?? undefined}
                />
              </div>
            ) : (
              <div
                style={{ boxShadow: "var(--shadow-panel)" }}
                className="surface flex flex-col items-center justify-center rounded-[var(--radius-2)] border border-[var(--border-default)] p-8 text-center sm:p-14"
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] sm:size-16">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-7 sm:size-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>

                <SmoothTitleAccent
                  as="h2"
                  className="mt-5 text-lg font-bold text-[var(--text-body)] sm:text-xl"
                  accessibleTitle="Listo para monitorear"
                  before="Listo para "
                  accent="monitorear"
                  amplitude={3}
                />

                <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
                  Selecciona ambiente, namespace y carga de trabajo en el panel
                  lateral y pulsa{" "}
                  <strong className="font-semibold text-[var(--text-body)]">
                    Empezar a ver logs
                  </strong>{" "}
                  para recibir eventos en tiempo real.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 font-semibold">
                    Multi-pod
                  </span>
                  <span className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 font-semibold">
                    Prod y Test
                  </span>
                  <span className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 font-semibold">
                    Streaming en vivo
                  </span>
                </div>

                <div className="mt-8">
                  <SmoothLinkScramble
                    to="/"
                    className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--border-default)]"
                    accessibleLabel="Volver al portal de aplicaciones"
                    before="Volver al "
                    scrambleText="portal"
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <GcloudLoginModal
        open={showLoginModal}
        onClose={handleCloseLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
};
