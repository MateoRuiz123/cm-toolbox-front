import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  authCluster,
  fetchWorkloads,
  isGcloudAuthRequired,
} from "../logs/api/logs-api";
import type { WorkloadInfo } from "../logs/api/logs-types";
import { leerLogsFavoritos, leerLogsRecientes } from "../logs/logs-sesion";
import {
  slugifyBackendId,
  type BackendEnvTarget,
  type UserBackendItem,
} from "./api/backends-api";

export interface AddBackendModalProps {
  readonly initialBackend: UserBackendItem | null;
  readonly canViewProd: boolean;
  readonly defaultOrder: number;
  readonly userEmail?: string;
  readonly suspendEscape?: boolean;
  readonly onRequestGcloudAuth?: () => void;
  readonly onSave: (backend: UserBackendItem) => Promise<void>;
  readonly onClose: () => void;
}

interface PairedSuggestion {
  readonly workloadName: string;
  readonly test?: WorkloadInfo;
  readonly prod?: WorkloadInfo;
}

const buildLocalCatalogSeed = (email?: string): PairedSuggestion[] => {
  const combined = [...leerLogsFavoritos(email), ...leerLogsRecientes(email)];
  const byName = new Map<string, { test?: WorkloadInfo; prod?: WorkloadInfo }>();
  for (const item of combined) {
    const entry = byName.get(item.workloadName) ?? {};
    const info: WorkloadInfo = {
      cluster: item.cluster,
      location: "us-central1",
      namespace: item.namespaceName,
      name: item.workloadName,
    };
    if (item.env === "test" && !entry.test) entry.test = info;
    if (item.env === "prod" && !entry.prod) entry.prod = info;
    byName.set(item.workloadName, entry);
  }
  return Array.from(byName.entries()).map(([workloadName, envs]) => ({
    workloadName,
    ...envs,
  }));
};

const clusterPriority = (cluster: string, env: "test" | "prod"): number => {
  if (env === "prod") {
    if (cluster === "cm-cluster-prod-ap-apis-02") return 3;
    if (cluster === "cluster-coordinadora-prod") return 2;
    if (cluster === "cm-cluster") return 1;
    return 0;
  }
  if (cluster === "cm-cluster-test-apis-01") return 3;
  if (cluster === "cluster-coordinadora-test-02") return 2;
  if (cluster === "cm-cluster-test") return 1;
  return 0;
};

const pickPreferredWorkload = (
  current: WorkloadInfo | undefined,
  incoming: WorkloadInfo,
  env: "test" | "prod",
): WorkloadInfo => {
  if (!current) return incoming;
  return clusterPriority(incoming.cluster, env) >
    clusterPriority(current.cluster, env)
    ? incoming
    : current;
};

const mergePairedCatalogs = (
  base: readonly PairedSuggestion[],
  testItems: readonly WorkloadInfo[],
  prodItems: readonly WorkloadInfo[],
): PairedSuggestion[] => {
  const byName = new Map<string, { test?: WorkloadInfo; prod?: WorkloadInfo }>();
  for (const item of base) {
    byName.set(item.workloadName, { test: item.test, prod: item.prod });
  }
  for (const item of testItems) {
    const entry = byName.get(item.name) ?? {};
    entry.test = pickPreferredWorkload(entry.test, item, "test");
    byName.set(item.name, entry);
  }
  for (const item of prodItems) {
    const entry = byName.get(item.name) ?? {};
    entry.prod = pickPreferredWorkload(entry.prod, item, "prod");
    byName.set(item.name, entry);
  }
  return Array.from(byName.entries())
    .map(([workloadName, envs]) => ({ workloadName, ...envs }))
    .sort((a, b) => a.workloadName.localeCompare(b.workloadName));
};

const reasonRequiresGcloudAuth = (reason: unknown): boolean => {
  if (isGcloudAuthRequired(reason)) return true;
  const msg = reason instanceof Error ? reason.message : String(reason);
  return /gcloud auth login|reauthentication|expirad|invalid_grant|credentials/i.test(
    msg,
  );
};

export const AddBackendModal = ({
  initialBackend,
  canViewProd,
  defaultOrder,
  userEmail,
  suspendEscape = false,
  onRequestGcloudAuth,
  onSave,
  onClose,
}: AddBackendModalProps) => {
  const isEditing = Boolean(initialBackend);

  const [name, setName] = useState(initialBackend?.name ?? "");
  const [description, setDescription] = useState(
    initialBackend?.description ?? "",
  );
  const [tagsRaw, setTagsRaw] = useState(
    initialBackend?.tags.join(", ") ?? "GKE",
  );

  const [testCluster, setTestCluster] = useState(
    initialBackend?.testTarget?.cluster ?? "cm-cluster-test",
  );
  const [testNamespace, setTestNamespace] = useState(
    initialBackend?.testTarget?.namespace ?? "",
  );
  const [testWorkload, setTestWorkload] = useState(
    initialBackend?.testTarget?.workload ?? "",
  );
  const [testHealthUrl, setTestHealthUrl] = useState(
    initialBackend?.testTarget?.healthUrl ?? "",
  );

  const [prodCluster, setProdCluster] = useState(
    initialBackend?.prodTarget?.cluster ?? "cm-cluster",
  );
  const [prodNamespace, setProdNamespace] = useState(
    initialBackend?.prodTarget?.namespace ?? "",
  );
  const [prodWorkload, setProdWorkload] = useState(
    initialBackend?.prodTarget?.workload ?? "",
  );
  const [prodHealthUrl, setProdHealthUrl] = useState(
    initialBackend?.prodTarget?.healthUrl ?? "",
  );

  const [gkeSearch, setGkeSearch] = useState("");
  const [searchingGke, setSearchingGke] = useState(false);
  const [gkeError, setGkeError] = useState<string | null>(null);
  const [gkeNeedsAuth, setGkeNeedsAuth] = useState(false);
  const [catalog, setCatalog] = useState<PairedSuggestion[]>(() =>
    buildLocalCatalogSeed(userEmail),
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || suspendEscape) return;
      if (dropdownOpen) {
        setDropdownOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, suspendEscape, dropdownOpen]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const queryEnvWorkloads = async (
    env: "test" | "prod",
    query?: string,
  ): Promise<WorkloadInfo[]> => {
    await authCluster(env);
    const list = await fetchWorkloads(env, "__all__", query);
    return Array.isArray(list) ? list : [];
  };

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      authCluster("test").then(() => fetchWorkloads("test", "__all__")),
      canViewProd
        ? authCluster("prod").then(() => fetchWorkloads("prod", "__all__"))
        : Promise.resolve<WorkloadInfo[]>([]),
    ]).then(([testRes, prodRes]) => {
      if (!active) return;
      const testItems =
        testRes.status === "fulfilled" && Array.isArray(testRes.value)
          ? testRes.value
          : [];
      const prodItems =
        prodRes.status === "fulfilled" && Array.isArray(prodRes.value)
          ? prodRes.value
          : [];
      if (testItems.length > 0 || prodItems.length > 0) {
        setCatalog((prev) => mergePairedCatalogs(prev, testItems, prodItems));
      }
      const authFailed =
        (testRes.status === "rejected" &&
          reasonRequiresGcloudAuth(testRes.reason)) ||
        (canViewProd &&
          prodRes.status === "rejected" &&
          reasonRequiresGcloudAuth(prodRes.reason));
      if (authFailed) {
        setGkeNeedsAuth(true);
      }
    });
    return () => {
      active = false;
    };
  }, [canViewProd]);

  const handleSearchGke = async () => {
    const query = gkeSearch.trim();
    setSearchingGke(true);
    setGkeError(null);
    setGkeNeedsAuth(false);
    try {
      const [testRes, prodRes] = await Promise.allSettled([
        queryEnvWorkloads("test", query || undefined),
        canViewProd
          ? queryEnvWorkloads("prod", query || undefined)
          : Promise.resolve<WorkloadInfo[]>([]),
      ]);

      const testItems = testRes.status === "fulfilled" ? testRes.value : [];
      const prodItems = prodRes.status === "fulfilled" ? prodRes.value : [];

      const testRejected = testRes.status === "rejected";
      const prodRejected = canViewProd && prodRes.status === "rejected";

      const authFailed =
        (testRejected && reasonRequiresGcloudAuth(testRes.reason)) ||
        (prodRejected && reasonRequiresGcloudAuth(prodRes.reason));

      if (authFailed) {
        setGkeNeedsAuth(true);
        setGkeError(
          "Tu sesión de Google Cloud (gcloud) expiró. Inicia sesión en GKE para listar tus workloads.",
        );
      } else if (testRejected && (!canViewProd || prodRejected)) {
        setGkeError(
          "No se pudieron consultar workloads en GKE. Puedes ingresar los datos manualmente abajo.",
        );
      }

      if (testItems.length > 0 || prodItems.length > 0) {
        setCatalog((prev) => mergePairedCatalogs(prev, testItems, prodItems));
        setDropdownOpen(true);
      } else if (!authFailed && !testRejected && query) {
        setGkeError(`Sin coincidencias en GKE para “${query}”.`);
      }
    } finally {
      setSearchingGke(false);
    }
  };

  const filteredSuggestions = useMemo(() => {
    const q = gkeSearch.trim().toLowerCase();
    const list = !q
      ? catalog
      : catalog.filter(
          (item) =>
            item.workloadName.toLowerCase().includes(q) ||
            item.test?.namespace.toLowerCase().includes(q) ||
            item.test?.cluster.toLowerCase().includes(q) ||
            item.prod?.namespace.toLowerCase().includes(q) ||
            item.prod?.cluster.toLowerCase().includes(q),
        );
    return list.slice(0, 12);
  }, [catalog, gkeSearch]);

  const handlePickSuggestion = (item: PairedSuggestion) => {
    if (!name.trim()) {
      setName(item.workloadName);
    }
    setGkeSearch(item.workloadName);
    if (item.test) {
      setTestCluster(item.test.cluster);
      setTestNamespace(item.test.namespace);
      setTestWorkload(item.test.name);
    }
    if (item.prod) {
      setProdCluster(item.prod.cluster);
      setProdNamespace(item.prod.namespace);
      setProdWorkload(item.prod.name);
    }
    setDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDropdownOpen(true);
      if (filteredSuggestions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredSuggestions.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredSuggestions.length > 0) {
        setHighlightedIndex(
          (prev) =>
            (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length,
        );
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (
        dropdownOpen &&
        highlightedIndex >= 0 &&
        highlightedIndex < filteredSuggestions.length
      ) {
        handlePickSuggestion(filteredSuggestions[highlightedIndex]);
        return;
      }
      void handleSearchGke();
    }
  };

  const buildTarget = (
    cluster: string,
    namespace: string,
    workload: string,
    healthUrl: string,
  ): BackendEnvTarget | null => {
    const c = cluster.trim();
    const ns = namespace.trim();
    const wl = workload.trim();
    if (!c || !ns || !wl) return null;
    return {
      cluster: c,
      namespace: ns,
      workload: wl,
      healthUrl: healthUrl.trim() || null,
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setSubmitError("Ingresa un nombre descriptivo para el backend.");
      return;
    }

    const testTarget = buildTarget(
      testCluster,
      testNamespace,
      testWorkload,
      testHealthUrl,
    );
    const prodTarget = buildTarget(
      prodCluster,
      prodNamespace,
      prodWorkload,
      prodHealthUrl,
    );

    if (!testTarget && !prodTarget) {
      setSubmitError(
        "Configura al menos un ambiente (Test o Producción) con cluster, namespace y workload.",
      );
      return;
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    setSaving(true);
    try {
      await onSave({
        id: initialBackend?.id ?? slugifyBackendId(trimmedName),
        name: trimmedName,
        description: description.trim(),
        tags,
        testTarget,
        prodTarget,
        displayOrder: initialBackend?.displayOrder ?? defaultOrder,
      });
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el backend.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-backend-modal-title"
        style={{ boxShadow: "var(--elevation-modal)" }}
        className="animate-modal-dialog my-8 w-full max-w-2xl rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--border-default)] pb-3">
          <div>
            <h2
              id="add-backend-modal-title"
              className="text-lg font-bold text-[var(--text-body)]"
            >
              {isEditing
                ? `Editar ${initialBackend?.name}`
                : "Añadir backend a tu catálogo"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Vincula las cargas de trabajo de Test y Producción para compararlas lado a lado.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-body)]"
          >
            &times;
          </button>
        </div>

        <div
          ref={comboboxRef}
          className="relative mb-5 rounded-[var(--radius-2)] border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/45 p-3.5"
        >
          <span className="block text-xs font-bold text-[var(--color-primary)]">
            Autocompletar desde GKE (escribe para filtrar la lista)
          </span>
          <div className="mt-2 flex gap-2">
            <input
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={dropdownOpen && filteredSuggestions.length > 0}
              aria-label="Buscar workload en GKE"
              placeholder="Escribe para buscar o selecciona de la lista..."
              value={gkeSearch}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setGkeSearch(e.target.value);
                setDropdownOpen(true);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-sm text-[var(--text-body)]"
            />
            <button
              type="button"
              disabled={searchingGke}
              onClick={() => void handleSearchGke()}
              className="shrink-0 cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-1.5 text-xs font-bold text-[var(--color-action-contrast)] transition hover:bg-[var(--color-action-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searchingGke ? "Buscando..." : "Buscar en GKE"}
            </button>
          </div>

          {dropdownOpen && filteredSuggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label="Coincidencias de workloads"
              style={{ boxShadow: "var(--elevation-raised)" }}
              className="absolute left-3.5 right-3.5 top-[calc(100%-0.25rem)] z-30 max-h-56 overflow-y-auto rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-dropdown)] p-1.5"
            >
              {filteredSuggestions.map((item, idx) => {
                const active = idx === highlightedIndex;
                return (
                  <li
                    key={item.workloadName}
                    role="option"
                    aria-selected={active}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handlePickSuggestion(item)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-1)] px-3 py-2 text-left text-xs transition ${
                        active
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
                      }`}
                    >
                      <span className="font-mono font-bold">
                        {item.workloadName}
                      </span>
                      <span className="truncate text-[11px] text-[var(--text-muted)]">
                        {item.test
                          ? `TEST (${item.test.cluster}/${item.test.namespace})`
                          : ""}
                        {item.test && item.prod ? " · " : ""}
                        {item.prod
                          ? `PROD (${item.prod.cluster}/${item.prod.namespace})`
                          : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {(gkeError || gkeNeedsAuth) && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--text-muted)]">
                {gkeError ??
                  "Sesión de Google Cloud expirada; inicia sesión para autocompletar desde GKE."}
              </p>
              {gkeNeedsAuth && onRequestGcloudAuth && (
                <button
                  type="button"
                  onClick={onRequestGcloudAuth}
                  className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--state-warning)] px-3 py-1 text-[11px] font-bold text-white transition hover:opacity-90"
                >
                  Iniciar sesión en GKE
                </button>
              )}
            </div>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {submitError && (
            <div
              role="alert"
              className="rounded-[var(--radius-1)] border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-3 py-2 text-xs font-medium text-[var(--alert-error-fg)]"
            >
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Nombre del servicio
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: CM API Guías"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[var(--text-body)]">
                Etiquetas (separadas por coma)
              </span>
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="GKE, Migración, Node"
                className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-[var(--text-body)]">
              Descripción breve
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Microservicio de consulta y re-migración de guías"
              className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <fieldset className="space-y-2.5 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/50 p-3.5">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                Ambiente TEST
              </legend>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Cluster Test
                </span>
                <input
                  type="text"
                  aria-label="Cluster Test"
                  value={testCluster}
                  onChange={(e) => setTestCluster(e.target.value)}
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Namespace Test
                </span>
                <input
                  type="text"
                  aria-label="Namespace Test"
                  value={testNamespace}
                  onChange={(e) => setTestNamespace(e.target.value)}
                  placeholder="apps"
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Workload Test
                </span>
                <input
                  type="text"
                  aria-label="Workload Test"
                  value={testWorkload}
                  onChange={(e) => setTestWorkload(e.target.value)}
                  placeholder="cm-api-guias"
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  URL /health Test (opcional)
                </span>
                <input
                  type="text"
                  aria-label="URL health Test"
                  value={testHealthUrl}
                  onChange={(e) => setTestHealthUrl(e.target.value)}
                  placeholder="/logs-api/health"
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
                <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                  Opcional — GKE ya reporta el estado de pods sin URL pública.
                </span>
              </label>
            </fieldset>

            <fieldset className="space-y-2.5 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)]/50 p-3.5">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                Ambiente PROD
              </legend>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Cluster Prod
                </span>
                <input
                  type="text"
                  aria-label="Cluster Prod"
                  value={prodCluster}
                  onChange={(e) => setProdCluster(e.target.value)}
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Namespace Prod
                </span>
                <input
                  type="text"
                  aria-label="Namespace Prod"
                  value={prodNamespace}
                  onChange={(e) => setProdNamespace(e.target.value)}
                  placeholder="apps"
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Workload Prod
                </span>
                <input
                  type="text"
                  aria-label="Workload Prod"
                  value={prodWorkload}
                  onChange={(e) => setProdWorkload(e.target.value)}
                  placeholder="cm-api-guias"
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  URL /health Prod (opcional)
                </span>
                <input
                  type="text"
                  aria-label="URL health Prod"
                  value={prodHealthUrl}
                  onChange={(e) => setProdHealthUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-0.5 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]"
                />
                <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                  Opcional — úsalo solo si el servicio expone `/health` hacia el navegador.
                </span>
              </label>
            </fieldset>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-[var(--border-default)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2 text-xs font-bold text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)] disabled:cursor-wait disabled:opacity-70"
            >
              {saving ? "Guardando..." : "Guardar backend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
