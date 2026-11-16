import { buildAccessHeaders } from "../../../shared/auth/access-api";
import { safeStorage } from "../../../shared/lib/safe-storage";

export type AppHealthState =
  | "online"
  | "degraded"
  | "offline"
  | "unmonitored";

export interface AppHealthResult {
  readonly appId: string;
  readonly state: AppHealthState;
  readonly latencyMs: number | null;
  readonly checkedAt: number;
}

export interface IncidentReportPayload {
  readonly appId: string;
  readonly appName: string;
  readonly subject: string;
  readonly message: string;
  readonly detectedState: string;
}

export interface IncidentReportResponse {
  readonly ticketId: string;
  readonly createdAt: string;
  readonly status: "sent";
  readonly notifiedWebhook: boolean;
  readonly deliveryMode: "backend" | "local_fallback";
}

export type BentoSize = "featured" | "wide" | "standard";

export interface AppsUsageRankingData {
  readonly counts: Readonly<Record<string, number>>;
  readonly layoutMeta: Readonly<Record<string, BentoSize>> | null;
}

const HEALTH_ENDPOINTS: Readonly<Record<string, string>> = {
  diagnostico: "/diagnostico-api/health",
  logs: "/logs-api/health",
  docs: "/docs-api/health",
};

const ACCESS_BASE_PATH = "/access-api/v1";
const HEALTH_CACHE_TTL_MS = 15_000;
const HEALTH_TIMEOUT_MS = 3_500;
const LOCAL_USAGE_KEY = "cm-toolbox:hub-usage-counts";
const LOCAL_INCIDENTS_KEY = "cm-toolbox:local-incidents";

const healthCache = new Map<string, AppHealthResult>();

export const resetAppsHealthCache = (): void => {
  healthCache.clear();
};

export const isMonitoredApp = (appId: string): boolean =>
  Object.prototype.hasOwnProperty.call(HEALTH_ENDPOINTS, appId);

const resolveLatencyNow = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const interpretHealthPayload = (
  ok: boolean,
  body: unknown,
): AppHealthState => {
  if (body && typeof body === "object" && "status" in body) {
    const rawStatus = String((body as { status: unknown }).status).toLowerCase();
    if (rawStatus === "unhealthy" || rawStatus === "down") {
      return "offline";
    }
    if (rawStatus === "degraded") {
      return "degraded";
    }
    if (ok && (rawStatus === "ok" || rawStatus === "healthy" || rawStatus === "alive")) {
      return "online";
    }
  }
  return ok ? "online" : "offline";
};

/** Consulta el endpoint /health same-origin del microservicio con caché corta y timeout. */
export const probeAppHealth = async (
  appId: string,
  options?: { readonly force?: boolean; readonly signal?: AbortSignal },
): Promise<AppHealthResult> => {
  const endpoint = HEALTH_ENDPOINTS[appId];
  const now = Date.now();
  if (!endpoint) {
    return { appId, state: "unmonitored", latencyMs: null, checkedAt: now };
  }

  const isTestMode =
    typeof import.meta !== "undefined" && import.meta.env?.MODE === "test";
  const cached = healthCache.get(appId);
  if (!options?.force && !isTestMode && cached && now - cached.checkedAt < HEALTH_CACHE_TTL_MS) {
    return cached;
  }

  const controller = new AbortController();
  const abortTimer = globalThis.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onParentAbort, { once: true });

  const start = resolveLatencyNow();
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const latencyMs = Math.max(1, Math.round(resolveLatencyNow() - start));
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const result: AppHealthResult = {
      appId,
      state: interpretHealthPayload(response.ok, payload),
      latencyMs,
      checkedAt: Date.now(),
    };
    healthCache.set(appId, result);
    return result;
  } catch {
    const result: AppHealthResult = {
      appId,
      state: "offline",
      latencyMs: null,
      checkedAt: Date.now(),
    };
    healthCache.set(appId, result);
    return result;
  } finally {
    globalThis.clearTimeout(abortTimer);
    options?.signal?.removeEventListener("abort", onParentAbort);
  }
};

export const readLocalUsageCounts = (): Record<string, number> => {
  try {
    const raw = safeStorage.getItem(LOCAL_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const clean: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        clean[key] = value;
      }
    }
    return clean;
  } catch {
    return {};
  }
};

const incrementLocalUsageCount = (appId: string): void => {
  const counts = readLocalUsageCounts();
  counts[appId] = (counts[appId] ?? 0) + 1;
  safeStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(counts));
};

/** Registra la apertura de una herramienta en backend y en respaldo local para el ranking. */
export const recordAppOpenEvent = async (appId: string): Promise<void> => {
  incrementLocalUsageCount(appId);
  try {
    await fetch(`${ACCESS_BASE_PATH}/apps/${encodeURIComponent(appId)}/usage`, {
      method: "POST",
      headers: buildAccessHeaders(false),
      keepalive: true,
    });
  } catch {
    // El respaldo local conserva el conteo si no hay conectividad con access-ms
  }
};

const parseLayoutMeta = (raw: unknown): Record<string, BentoSize> | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const result: Record<string, BentoSize> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val === "featured" || val === "wide" || val === "standard") {
      result[key] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
};

/** Obtiene el ranking de herramientas más usadas y los tamaños Bento globales desde access-ms. */
export const fetchAppsUsageRanking = async (): Promise<AppsUsageRankingData> => {
  const localCounts = readLocalUsageCounts();
  try {
    const response = await fetch(`${ACCESS_BASE_PATH}/apps/usage-ranking`, {
      method: "GET",
      headers: buildAccessHeaders(false),
    });
    if (!response.ok) {
      return { counts: localCounts, layoutMeta: null };
    }
    const payload = (await response.json()) as {
      data?: {
        counts?: Record<string, number>;
        layoutMeta?: Record<string, unknown> | null;
      };
    };
    const remoteCounts = payload?.data?.counts ?? {};
    const merged: Record<string, number> = { ...localCounts };
    for (const [appId, count] of Object.entries(remoteCounts)) {
      if (typeof count === "number" && Number.isFinite(count)) {
        merged[appId] = Math.max(merged[appId] ?? 0, count);
      }
    }
    return {
      counts: merged,
      layoutMeta: parseLayoutMeta(payload?.data?.layoutMeta),
    };
  } catch {
    return { counts: localCounts, layoutMeta: null };
  }
};

/** Guarda el orden global predeterminado y tamaños Bento (solo SuperAdmin). */
export const saveGlobalAppsOrder = async (
  items: readonly { readonly appId: string; readonly displayOrder: number }[],
  layoutMeta?: Readonly<Record<string, BentoSize>>,
): Promise<void> => {
  const response = await fetch(`${ACCESS_BASE_PATH}/admin/apps/order`, {
    method: "PUT",
    headers: buildAccessHeaders(true),
    body: JSON.stringify({ items, layoutMeta }),
  });

  if (!response.ok) {
    let message = `No se pudo guardar el orden global (HTTP ${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Ignorar fallo de parseo JSON
    }
    throw new Error(message);
  }
};

const saveLocalFallbackIncident = (
  payload: IncidentReportPayload,
): IncidentReportResponse => {
  const createdAt = new Date().toISOString();
  const ticketId = `INC-${Date.now().toString(36).toUpperCase()}`;
  try {
    const raw = safeStorage.getItem(LOCAL_INCIDENTS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    const safeList = Array.isArray(list) ? list.slice(-19) : [];
    safeList.push({ ticketId, createdAt, ...payload });
    safeStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(safeList));
  } catch {
    // Ignorar error de almacenamiento
  }
  return {
    ticketId,
    createdAt,
    status: "sent",
    notifiedWebhook: false,
    deliveryMode: "local_fallback",
  };
};

/** Envía un reporte automático de incidencia a access-ms con respaldo local en caso de caída de red. */
export const sendAutomaticIncidentReport = async (
  payload: IncidentReportPayload,
): Promise<IncidentReportResponse> => {
  try {
    const response = await fetch(`${ACCESS_BASE_PATH}/incidents/report`, {
      method: "POST",
      headers: buildAccessHeaders(true),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const body = (await response.json()) as {
        data?: {
          ticketId?: string;
          createdAt?: string;
          status?: "sent";
          notifiedWebhook?: boolean;
        };
      };
      if (body.data?.ticketId) {
        return {
          ticketId: body.data.ticketId,
          createdAt: body.data.createdAt ?? new Date().toISOString(),
          status: "sent",
          notifiedWebhook: Boolean(body.data.notifiedWebhook),
          deliveryMode: "backend",
        };
      }
    }

    if (response.status >= 400 && response.status < 500) {
      let message = "Los datos del reporte son inválidos.";
      try {
        const errBody = (await response.json()) as { message?: string };
        if (errBody.message) message = errBody.message;
      } catch {
        // Ignorar fallo de parseo
      }
      throw new Error(message);
    }

    return saveLocalFallbackIncident(payload);
  } catch (error) {
    if (error instanceof Error && error.message.includes("inválidos")) {
      throw error;
    }
    return saveLocalFallbackIncident(payload);
  }
};
