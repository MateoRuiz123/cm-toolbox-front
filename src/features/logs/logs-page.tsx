import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
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
import {
  agruparAccesosPorWorkload,
  alternarLogFavorito,
  esLogFavorito,
  guardarLogsSesion,
  idWorkload,
  leerLogsFavoritos,
  leerLogsRecientes,
  leerLogsSesion,
  registrarLogReciente,
  type LogsAccesoAgrupado,
  type LogsAccesoRapido,
} from "./logs-sesion";
import { buildGcpLogsExplorerUrl, buildGkeWorkloadUrl } from "./gcp-links";

type TailLinesOption = 100 | 200 | 500 | 1000;
type SinceOption = "" | "5m" | "15m" | "1h" | "6h";

const TAIL_LINES_OPTIONS: readonly TailLinesOption[] = [100, 200, 500, 1000];
const SINCE_OPTIONS: ReadonlyArray<{ readonly value: SinceOption; readonly label: string }> = [
  { value: "", label: "Todo" },
  { value: "5m", label: "Últimos 5 min" },
  { value: "15m", label: "Últimos 15 min" },
  { value: "1h", label: "Última 1 hora" },
  { value: "6h", label: "Últimas 6 horas" },
];

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
  const { canPerformAction, profile } = useAccess();
  const userEmail = profile.email;
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
  const [loadedWorkloadsKey, setLoadedWorkloadsKey] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [envProject, setEnvProject] = useState<string | undefined>(undefined);
  const [tailLines, setTailLines] = useState<TailLinesOption>(200);
  const [since, setSince] = useState<SinceOption>("");
  const [favoritosState, setFavoritosState] = useState<{
    email: string;
    items: LogsAccesoRapido[];
  }>(() => ({ email: userEmail, items: leerLogsFavoritos(userEmail) }));
  const [recientesState, setRecientesState] = useState<{
    email: string;
    items: LogsAccesoRapido[];
  }>(() => ({ email: userEmail, items: leerLogsRecientes(userEmail) }));

  const favoritos =
    favoritosState.email === userEmail
      ? favoritosState.items
      : leerLogsFavoritos(userEmail);
  const recientes =
    recientesState.email === userEmail
      ? recientesState.items
      : leerLogsRecientes(userEmail);
  const [streamTarget, setStreamTarget] = useState<LogsViewerTarget | null>(
    null,
  );
  const wsRef = useRef<WebSocket | null>(null);
  const wsAuthenticatedRef = useRef(false);
  const pendingAutoStartRef = useRef(false);
  const startStreamRef = useRef<(target: LogsViewerTarget) => void>(() => undefined);
  const catalogRequestIdRef = useRef(0);

  const workloadsScopeKey =
    env && selectedNamespace ? `${env}|${selectedNamespace}` : "";
  const loadingWorkloads =
    Boolean(workloadsScopeKey) && loadedWorkloadsKey !== workloadsScopeKey;

  const detachAndCloseSocket = useCallback((ws: WebSocket | null) => {
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "stop" }));
    }
    ws.close();
  }, []);

  const handleStop = useCallback(() => {
    detachAndCloseSocket(wsRef.current);
    wsRef.current = null;
    wsAuthenticatedRef.current = false;
    setIsStreaming(false);
  }, [detachAndCloseSocket]);

  const loadCatalogForEnv = useCallback(async (selectedEnv: LogEnvironment) => {
    const requestId = ++catalogRequestIdRef.current;
    if (
      restauracionRef.current &&
      restauracionRef.current.env !== selectedEnv
    ) {
      restauracionRef.current = null;
    }
    setLoadingCatalog(true);
    setFormError(null);
    setGcloudAuthRequired(false);
    setEnvProject(undefined);
    setNamespaces([]);
    setSelectedNamespace("");
    setWorkloads([]);
    setSelectedWorkload("");

    try {
      const authResult = await authCluster(selectedEnv);
      if (catalogRequestIdRef.current !== requestId) return;
      setEnvProject(authResult.project);
      const ns = await fetchNamespaces(selectedEnv);
      if (catalogRequestIdRef.current !== requestId) return;
      setNamespaces(ns);
      const pendiente = restauracionRef.current;
      if (
        pendiente?.env === selectedEnv &&
        pendiente.namespace &&
        (pendiente.namespace === "__all__" || ns.includes(pendiente.namespace))
      ) {
        setSelectedNamespace(pendiente.namespace);
      } else if (pendiente?.env === selectedEnv) {
        restauracionRef.current = null;
      }
    } catch (err) {
      if (catalogRequestIdRef.current !== requestId) return;
      pendingAutoStartRef.current = false;
      restauracionRef.current = null;
      const message = err instanceof Error ? err.message : "Error autenticando";
      setFormError(message);
      const needsLogin = isGcloudAuthRequired(err);
      setGcloudAuthRequired(needsLogin);
      if (needsLogin) {
        setShowLoginModal(true);
      }
    } finally {
      if (catalogRequestIdRef.current === requestId) {
        setLoadingCatalog(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!env) return;
    void loadCatalogForEnv(env);
  }, [env, loadCatalogForEnv]);

  useEffect(() => {
    if (!env || !selectedNamespace) return;
    let cancelled = false;
    const scopeKey = `${env}|${selectedNamespace}`;

    fetchWorkloads(env, selectedNamespace)
      .then((list) => {
        if (cancelled) return;
        setWorkloads(list);
        setLoadedWorkloadsKey(scopeKey);
        const pendiente = restauracionRef.current;
        if (
          pendiente?.namespace === selectedNamespace &&
          pendiente.workload
        ) {
          const matched = list.find(
            (workload) =>
              idWorkload(
                workload.cluster,
                workload.namespace,
                workload.name,
              ) === pendiente.workload,
          );
          if (matched) {
            setSelectedWorkload(pendiente.workload);
            if (pendingAutoStartRef.current) {
              pendingAutoStartRef.current = false;
              startStreamRef.current({
                workload: matched.name,
                namespace: matched.namespace,
                cluster: matched.cluster,
                env,
                location: matched.location,
                project: matched.project,
              });
            }
          } else {
            pendingAutoStartRef.current = false;
          }
        } else {
          pendingAutoStartRef.current = false;
        }
        restauracionRef.current = null;
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Error cargando workloads";
        pendingAutoStartRef.current = false;
        restauracionRef.current = null;
        setFormError(message);
        setLoadedWorkloadsKey(scopeKey);
      });

    return () => {
      cancelled = true;
    };
  }, [env, selectedNamespace]);

  const filteredWorkloads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workloads;
    return workloads.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.namespace.toLowerCase().includes(query) ||
        w.cluster.toLowerCase().includes(query),
    );
  }, [workloads, search]);

  useEffect(() => () => handleStop(), [handleStop]);

  useEffect(() => {
    if (restauracionRef.current) return;
    guardarLogsSesion(
      env
        ? { env, namespace: selectedNamespace, workload: selectedWorkload }
        : null,
    );
  }, [env, selectedNamespace, selectedWorkload]);

  const resolveTargetFromSelection = useCallback(
    (workloadKey: string): LogsViewerTarget | null => {
      if (!env || !workloadKey) return null;
      const [cluster, ns, wlName] = workloadKey.split("|");
      if (!cluster || !ns || !wlName) return null;
      const matched = workloads.find(
        (w) =>
          w.cluster === cluster && w.namespace === ns && w.name === wlName,
      );
      return {
        workload: wlName,
        namespace: ns,
        cluster,
        env,
        location: matched?.location,
        project: matched?.project ?? envProject,
      };
    },
    [env, workloads, envProject],
  );

  const startStream = useCallback(
    (target: LogsViewerTarget) => {
      setLogs([]);
      setIsStreaming(true);
      setFormError(null);
      setStreamTarget(target);

      const envTarget = target.env === "prod" ? "prod" : "test";
      setRecientesState({
        email: userEmail,
        items: registrarLogReciente(
          {
            env: envTarget,
            namespace: `${target.cluster}|${target.namespace}`,
            workload: idWorkload(
              target.cluster,
              target.namespace,
              target.workload,
            ),
            cluster: target.cluster,
            namespaceName: target.namespace,
            workloadName: target.workload,
          },
          userEmail,
        ),
      });

      const startPayload = JSON.stringify({
        action: "start",
        env: target.env,
        cluster: target.cluster,
        namespace: target.namespace,
        workload: target.workload,
        tailLines,
        ...(since ? { since } : {}),
      });

      const existingWs = wsRef.current;
      if (
        existingWs &&
        existingWs.readyState === WebSocket.OPEN &&
        wsAuthenticatedRef.current
      ) {
        existingWs.send(startPayload);
        return;
      }

      detachAndCloseSocket(existingWs);
      wsRef.current = null;
      wsAuthenticatedRef.current = false;

      const ws = createLogsWebSocket();
      wsRef.current = ws;

      ws.onopen = () => {
        authenticateLogsWebSocket(ws);
      };

      ws.onmessage = (event) => {
        const msg = parseLogStreamMessage(String(event.data));
        if (!msg) return;
        if (msg.type === "authenticated") {
          wsAuthenticatedRef.current = true;
          ws.send(startPayload);
          return;
        }
        setLogs((prev) => appendBoundedLog(prev, msg));
      };

      ws.onerror = () => {
        wsAuthenticatedRef.current = false;
        setFormError("Error en conexión WebSocket");
        setIsStreaming(false);
      };

      ws.onclose = () => {
        wsAuthenticatedRef.current = false;
        setIsStreaming(false);
      };
    },
    [detachAndCloseSocket, tailLines, since, userEmail],
  );

  useEffect(() => {
    startStreamRef.current = startStream;
  }, [startStream]);

  const handleToggleFavorite = useCallback(() => {
    const target = resolveTargetFromSelection(selectedWorkload);
    if (!target) return;
    const envTarget: LogEnvironment = target.env === "prod" ? "prod" : "test";
    setFavoritosState({
      email: userEmail,
      items: alternarLogFavorito(
        {
          env: envTarget,
          namespace: `${target.cluster}|${target.namespace}`,
          workload: idWorkload(
            target.cluster,
            target.namespace,
            target.workload,
          ),
          cluster: target.cluster,
          namespaceName: target.namespace,
          workloadName: target.workload,
        },
        userEmail,
      ),
    });
  }, [resolveTargetFromSelection, selectedWorkload, userEmail]);

  const handleSelectQuickAccess = useCallback(
    (item: LogsAccesoRapido) => {
      if (item.env === "prod" && !canViewProd) return;
      if (env === item.env && selectedNamespace === item.namespace) {
        setSelectedWorkload(item.workload);
        const matched = workloads.find(
          (w) =>
            idWorkload(w.cluster, w.namespace, w.name) === item.workload,
        );
        startStream({
          workload: item.workloadName,
          namespace: item.namespaceName,
          cluster: item.cluster,
          env: item.env,
          location: matched?.location,
          project: matched?.project ?? envProject,
        });
        return;
      }
      handleStop();
      restauracionRef.current = {
        env: item.env,
        namespace: item.namespace,
        workload: item.workload,
      };
      pendingAutoStartRef.current = true;
      if (env === item.env) {
        setSelectedNamespace(item.namespace);
      } else {
        setEnv(item.env);
      }
    },
    [canViewProd, env, selectedNamespace, workloads, envProject, startStream, handleStop],
  );

  const activeStreamKey = streamTarget
    ? idWorkload(streamTarget.cluster, streamTarget.namespace, streamTarget.workload)
    : "";
  const isSelectionChangedWhileStreaming =
    isStreaming &&
    Boolean(selectedWorkload) &&
    (selectedWorkload !== activeStreamKey || streamTarget?.env !== env);

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isStreaming && !isSelectionChangedWhileStreaming) {
      handleStop();
      return;
    }
    const target = resolveTargetFromSelection(selectedWorkload);
    if (target) {
      startStream(target);
    }
  };

  const handleReload = useCallback(() => {
    const selectionTarget = resolveTargetFromSelection(selectedWorkload);
    const targetToReload =
      selectionTarget && !isSelectionChangedWhileStreaming
        ? selectionTarget
        : streamTarget ?? selectionTarget;
    if (!targetToReload) return;
    startStream(targetToReload);
  }, [
    resolveTargetFromSelection,
    selectedWorkload,
    isSelectionChangedWhileStreaming,
    streamTarget,
    startStream,
  ]);

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
      handleStop();
      restauracionRef.current = null;
      guardarLogsSesion(null);
      setEnv(null);
      setEnvProject(undefined);
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
  const gcpPreviewTarget =
    resolveTargetFromSelection(selectedWorkload) ?? streamTarget;
  const isSelectedFavorite =
    Boolean(env && selectedWorkload) &&
    esLogFavorito(favoritos, env as LogEnvironment, selectedWorkload);
  const favoritosVisibles = useMemo(
    () => favoritos.filter((item) => item.env !== "prod" || canViewProd),
    [favoritos, canViewProd],
  );
  const recientesVisibles = useMemo(
    () => recientes.filter((item) => item.env !== "prod" || canViewProd),
    [recientes, canViewProd],
  );
  const favoritosAgrupados = useMemo(
    () => agruparAccesosPorWorkload(favoritosVisibles),
    [favoritosVisibles],
  );
  const recientesAgrupados = useMemo(
    () => agruparAccesosPorWorkload(recientesVisibles),
    [recientesVisibles],
  );

  const renderQuickAccessGroup = (
    group: LogsAccesoAgrupado,
    kind: "fav" | "rec",
  ) => {
    const isFav = kind === "fav";
    const wrapperClass = isFav
      ? "inline-flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--state-warning)]/30 bg-[var(--alert-warning-bg)]/60 px-2 py-1 text-[11px] font-medium text-[var(--text-body)]"
      : "inline-flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 py-1 text-[11px] font-medium text-[var(--text-body)]";

    if (group.prod && group.test) {
      const prodItem = group.prod;
      const testItem = group.test;
      return (
        <div
          key={`${kind}-${group.workloadName}`}
          className={wrapperClass}
        >
          {isFav && (
            <span aria-hidden="true" className="text-[var(--state-warning)]">
              ★
            </span>
          )}
          <span>{group.workloadName}</span>
          <div className="ml-0.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectQuickAccess(prodItem)}
              title={`PROD · ${prodItem.cluster} / ${prodItem.namespaceName}`}
              className="cursor-pointer rounded px-1 py-0.5 text-[10px] font-bold uppercase text-[var(--state-error)] transition hover:bg-[var(--state-error)]/15 focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]"
            >
              PROD
            </button>
            <button
              type="button"
              onClick={() => handleSelectQuickAccess(testItem)}
              title={`TEST · ${testItem.cluster} / ${testItem.namespaceName}`}
              className="cursor-pointer rounded px-1 py-0.5 text-[10px] font-bold uppercase text-[var(--state-warning)] transition hover:bg-[var(--state-warning)]/15 focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]"
            >
              TEST
            </button>
          </div>
        </div>
      );
    }

    const single = group.prod ?? group.test;
    if (!single) return null;
    return (
      <button
        key={`${kind}-${single.env}-${group.workloadName}`}
        type="button"
        onClick={() => handleSelectQuickAccess(single)}
        title={`${single.env.toUpperCase()} · ${single.cluster} / ${single.namespaceName}`}
        className={`${wrapperClass} cursor-pointer transition ${
          isFav
            ? "hover:border-[var(--state-warning)]"
            : "hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
        }`}
      >
        {isFav && (
          <span aria-hidden="true" className="text-[var(--state-warning)]">
            ★
          </span>
        )}
        <span>{group.workloadName}</span>
        <span className="text-[10px] uppercase text-[var(--text-muted)]">
          {single.env}
        </span>
      </button>
    );
  };

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
                  hint="Filtrado instantáneo"
                  placeholder="Ej. api-gateway"
                  disabled={!selectedNamespace}
                  workloads={filteredWorkloads}
                  loading={loadingWorkloads}
                  value={selectedWorkload}
                  onSelect={setSelectedWorkload}
                  onSearchChange={setSearch}
                  error={Boolean(formError)}
                  showClusterNamespace={selectedNamespace === "__all__"}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-xs font-bold text-[var(--text-body)]">
                      Líneas iniciales
                    </span>
                    <select
                      id="logs-tail-lines"
                      value={tailLines}
                      onChange={(e) =>
                        setTailLines(Number(e.target.value) as TailLinesOption)
                      }
                      className="mt-1.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-body)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    >
                      {TAIL_LINES_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count} líneas
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-[var(--text-body)]">
                      Ventana de tiempo
                    </span>
                    <select
                      id="logs-since"
                      value={since}
                      onChange={(e) => setSince(e.target.value as SinceOption)}
                      className="mt-1.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-body)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    >
                      {SINCE_OPTIONS.map((option) => (
                        <option key={option.value || "all"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
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

              <div className="mt-5 flex gap-2.5">
                <button
                  type="submit"
                  disabled={
                    !isStreaming && (!selectedWorkload || loadingCatalog)
                  }
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingCatalog && (
                    <span
                      aria-hidden="true"
                      className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
                    />
                  )}
                  {isStreaming && isSelectionChangedWhileStreaming
                    ? "Cambiar carga"
                    : isStreaming
                      ? "Detener streaming"
                      : loadingCatalog
                        ? "Conectando…"
                        : "Empezar a ver logs"}
                </button>
                {isStreaming && !isSelectionChangedWhileStreaming && (
                  <button
                    type="button"
                    onClick={handleReload}
                    title="Recargar streaming de logs"
                    aria-label="Recargar streaming de logs"
                    className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 11-2.64-6.36" />
                      <path d="M21 3v6h-6" />
                    </svg>
                    Recargar
                  </button>
                )}
                {isStreaming && isSelectionChangedWhileStreaming && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:border-[var(--state-error)]/50 hover:text-[var(--state-error)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    Detener
                  </button>
                )}
              </div>

              {gcpPreviewTarget && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-default)] pt-3">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                    Google Cloud:
                  </span>
                  <a
                    href={buildGkeWorkloadUrl(gcpPreviewTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                  >
                    Workload GKE
                  </a>
                  <a
                    href={buildGcpLogsExplorerUrl(gcpPreviewTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                  >
                    Logs GCP
                  </a>
                  {selectedWorkload && (
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      aria-pressed={isSelectedFavorite}
                      title={
                        isSelectedFavorite
                          ? "Quitar de favoritos"
                          : "Guardar en favoritos"
                      }
                      className={`ml-auto inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-1)] border px-2.5 py-1 text-[11px] font-semibold transition ${
                        isSelectedFavorite
                          ? "border-[var(--state-warning)]/50 bg-[var(--alert-warning-bg)] text-[var(--state-warning)]"
                          : "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--text-body)]"
                      }`}
                    >
                      <span aria-hidden="true">
                        {isSelectedFavorite ? "★" : "☆"}
                      </span>
                      Favorito
                    </button>
                  )}
                </div>
              )}
            </form>

            {(favoritosAgrupados.length > 0 ||
              recientesAgrupados.length > 0) && (
              <div className="surface space-y-2.5 rounded-[var(--radius-2)] border border-[var(--border-default)] p-4">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Accesos rápidos
                </span>

                {favoritosAgrupados.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
                      Favoritos
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {favoritosAgrupados.map((group) =>
                        renderQuickAccessGroup(group, "fav"),
                      )}
                    </div>
                  </div>
                )}

                {recientesAgrupados.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
                      Recientes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {recientesAgrupados.map((group) =>
                        renderQuickAccessGroup(group, "rec"),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
              <div className="surface flex h-[70dvh] min-h-[420px] flex-col overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] lg:h-auto lg:min-h-0 lg:flex-1">
                <LogsViewer
                  logs={logs}
                  isStreaming={isStreaming}
                  onClear={() => setLogs([])}
                  onReload={handleReload}
                  target={streamTarget ?? undefined}
                />
              </div>
            ) : (
              <div className="surface flex flex-col items-center justify-center rounded-[var(--radius-2)] border border-[var(--border-default)] p-8 text-center sm:p-14">
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
