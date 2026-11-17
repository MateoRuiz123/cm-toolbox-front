import { createHttpClient, HttpError } from "@/shared/api/http-client";
import { buildAccessHeaders } from "@/shared/auth/access-api";
import { safeStorage } from "@/shared/lib/safe-storage";
import type { LogEnvironment } from "../../logs/api/logs-types";
import {
  agruparAccesosPorWorkload,
  leerLogsFavoritos,
  leerLogsRecientes,
} from "../../logs/logs-sesion";

export interface BackendEnvTarget {
  readonly cluster: string;
  readonly namespace: string;
  readonly workload: string;
  readonly healthUrl?: string | null;
}

export interface UserBackendItem {
  readonly id: string;
  readonly userEmail?: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly testTarget: BackendEnvTarget | null;
  readonly prodTarget: BackendEnvTarget | null;
  readonly displayOrder: number;
  readonly updatedAt?: string;
}

export interface PodMetricItem {
  readonly name: string;
  readonly phase: string;
  readonly ready: boolean;
  readonly restarts: number;
  readonly cpuMillicores: number | null;
  readonly memoryMiB: number | null;
  readonly startedAt: string | null;
  readonly issueReason?: string | null;
  readonly issueMessage?: string | null;
}

export interface TrafficMetricsSummary {
  readonly windowMinutes: number;
  readonly sampledPod: string | null;
  readonly sampledPodsCount?: number;
  readonly totalRequests: number;
  readonly rpm: number;
  readonly count2xx: number;
  readonly count4xx: number;
  readonly count5xx: number;
  readonly rate4xxPercent: number;
  readonly rate5xxPercent: number;
  readonly logLinesCount?: number;
  readonly logsPerMinute?: number;
  readonly errorLinesCount?: number;
  readonly lastErrorMessage?: string | null;
}

export type WorkloadHealthStatus = "healthy" | "degraded" | "offline";

export interface WorkloadTelemetryData {
  readonly env: LogEnvironment;
  readonly cluster: string;
  readonly namespace: string;
  readonly workload: string;
  readonly status: WorkloadHealthStatus;
  readonly desiredReplicas: number;
  readonly readyReplicas: number;
  readonly totalRestarts: number;
  readonly deployedAt: string | null;
  readonly imageTag?: string | null;
  readonly imageRef?: string | null;
  readonly cpuRequestMillicores?: number | null;
  readonly cpuLimitMillicores?: number | null;
  readonly memoryRequestMiB?: number | null;
  readonly memoryLimitMiB?: number | null;
  readonly issueSummary?: string | null;
  readonly totalCpuMillicores: number | null;
  readonly totalMemoryMiB: number | null;
  readonly pods: readonly PodMetricItem[];
  readonly traffic: TrafficMetricsSummary;
  readonly checkedAt: string;
  readonly httpHealthStatus?: "ok" | "degraded" | "offline" | null;
  readonly httpLatencyMs?: number | null;
}

export class TelemetryAuthError extends Error {
  constructor(message = "Requiere iniciar sesión en GCP / GKE para leer métricas.") {
    super(message);
    this.name = "TelemetryAuthError";
  }
}

class BackendValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendValidationError";
  }
}

const ACCESS_BASE_PATH = "/access-api/v1";
const LOGS_API_URL = "/logs-api/api";
const LOCAL_STORAGE_PREFIX = "cm-toolbox:user-backends";

const logsTelemetryHttp = createHttpClient(LOGS_API_URL);

export const slugifyBackendId = (raw: string): string => {
  const cleaned = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || `backend-${Date.now().toString(36)}`;
};

const storageKeyForUser = (email?: string): string => {
  const normalized = email?.trim().toLowerCase();
  return normalized ? `${LOCAL_STORAGE_PREFIX}:${normalized}` : LOCAL_STORAGE_PREFIX;
};

export const readLocalBackends = (email?: string): UserBackendItem[] => {
  try {
    const raw = safeStorage.getItem(storageKeyForUser(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as UserBackendItem[]) : [];
  } catch {
    return [];
  }
};

const saveLocalBackends = (
  items: readonly UserBackendItem[],
  email?: string,
): void => {
  safeStorage.setItem(storageKeyForUser(email), JSON.stringify(items));
};

export const fetchUserBackends = async (
  email?: string,
): Promise<UserBackendItem[]> => {
  const localItems = readLocalBackends(email);
  try {
    const response = await fetch(`${ACCESS_BASE_PATH}/me/backends`, {
      method: "GET",
      headers: buildAccessHeaders(false),
    });
    if (!response.ok) {
      return localItems;
    }
    const payload = (await response.json()) as { data?: UserBackendItem[] };
    const remoteItems = Array.isArray(payload.data) ? payload.data : [];
    saveLocalBackends(remoteItems, email);
    return remoteItems;
  } catch {
    return localItems;
  }
};

export const upsertUserBackend = async (
  item: UserBackendItem,
  email?: string,
): Promise<UserBackendItem> => {
  const normalizedId = slugifyBackendId(item.id || item.name);
  const bodyPayload = {
    name: item.name.trim(),
    description: item.description.trim(),
    tags: [...item.tags],
    testTarget: item.testTarget,
    prodTarget: item.prodTarget,
    displayOrder: item.displayOrder,
  };

  let saved: UserBackendItem = {
    ...item,
    id: normalizedId,
    updatedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(
      `${ACCESS_BASE_PATH}/me/backends/${encodeURIComponent(normalizedId)}`,
      {
        method: "PUT",
        headers: buildAccessHeaders(true),
        body: JSON.stringify(bodyPayload),
      },
    );
    if (response.ok) {
      const payload = (await response.json()) as { data?: UserBackendItem };
      if (payload.data) {
        saved = payload.data;
      }
    } else if (response.status >= 400 && response.status < 500) {
      let msg = `No se pudo guardar el backend (HTTP ${response.status}).`;
      try {
        const err = (await response.json()) as { message?: string };
        if (err.message) msg = err.message;
      } catch {
        // Ignorar parse error
      }
      throw new BackendValidationError(msg);
    }
  } catch (error) {
    if (error instanceof BackendValidationError) {
      throw error;
    }
    // Respaldo local en caso de fallo de red con access-ms
  }

  const current = readLocalBackends(email);
  const next = current.some((b) => b.id === saved.id)
    ? current.map((b) => (b.id === saved.id ? saved : b))
    : [...current, saved];
  saveLocalBackends(next, email);
  return saved;
};

export const deleteUserBackend = async (
  backendId: string,
  email?: string,
): Promise<void> => {
  const next = readLocalBackends(email).filter((b) => b.id !== backendId);
  saveLocalBackends(next, email);
  try {
    await fetch(
      `${ACCESS_BASE_PATH}/me/backends/${encodeURIComponent(backendId)}`,
      {
        method: "DELETE",
        headers: buildAccessHeaders(false),
      },
    );
  } catch {
    // Eliminación optimista en respaldo local
  }
};

export const importFromLogsFavorites = async (
  email?: string,
  existing: readonly UserBackendItem[] = [],
): Promise<{ readonly items: UserBackendItem[]; readonly addedCount: number }> => {
  const combined = [...leerLogsFavoritos(email), ...leerLogsRecientes(email)];
  const grouped = agruparAccesosPorWorkload(combined);
  const currentMap = new Map(existing.map((b) => [b.id, b]));
  let addedCount = 0;

  for (const [index, group] of grouped.entries()) {
    const id = slugifyBackendId(group.workloadName);
    const prev = currentMap.get(id);
    const nextTest: BackendEnvTarget | null = group.test
      ? {
          cluster: group.test.cluster,
          namespace: group.test.namespaceName,
          workload: group.test.workloadName,
          healthUrl: prev?.testTarget?.healthUrl ?? null,
        }
      : (prev?.testTarget ?? null);
    const nextProd: BackendEnvTarget | null = group.prod
      ? {
          cluster: group.prod.cluster,
          namespace: group.prod.namespaceName,
          workload: group.prod.workloadName,
          healthUrl: prev?.prodTarget?.healthUrl ?? null,
        }
      : (prev?.prodTarget ?? null);

    if (!prev || (!prev.testTarget && nextTest) || (!prev.prodTarget && nextProd)) {
      const saved = await upsertUserBackend(
        {
          id,
          name: prev?.name ?? group.workloadName,
          description:
            prev?.description ?? "Importado desde accesos rápidos de Logs GKE.",
          tags: prev?.tags.length ? prev.tags : ["GKE"],
          testTarget: nextTest,
          prodTarget: nextProd,
          displayOrder: prev?.displayOrder ?? (existing.length + index + 1) * 10,
        },
        email,
      );
      currentMap.set(saved.id, saved);
      addedCount += 1;
    }
  }

  return {
    items: Array.from(currentMap.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    ),
    addedCount,
  };
};

const probeOptionalHealthUrl = async (
  healthUrl?: string | null,
): Promise<{
  readonly httpHealthStatus: "ok" | "degraded" | "offline" | null;
  readonly httpLatencyMs: number | null;
}> => {
  const url = healthUrl?.trim();
  if (!url) {
    return { httpHealthStatus: null, httpLatencyMs: null };
  }
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 3_500);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
    const httpLatencyMs = Math.max(1, Math.round(end - start));
    return {
      httpHealthStatus: res.ok ? "ok" : "offline",
      httpLatencyMs,
    };
  } catch {
    return { httpHealthStatus: "offline", httpLatencyMs: null };
  } finally {
    globalThis.clearTimeout(timer);
  }
};

export const fetchBackendEnvTelemetry = async (
  env: LogEnvironment,
  target: BackendEnvTarget,
  force = false,
): Promise<WorkloadTelemetryData> => {
  const params = new URLSearchParams({
    env,
    cluster: target.cluster,
    namespace: target.namespace,
    workload: target.workload,
  });
  if (force) params.set("force", "true");

  try {
    const [telemetry, httpProbe] = await Promise.all([
      logsTelemetryHttp.get<WorkloadTelemetryData>(
        `/workload-telemetry?${params.toString()}`,
      ),
      probeOptionalHealthUrl(target.healthUrl),
    ]);
    return {
      ...telemetry,
      ...httpProbe,
    };
  } catch (err) {
    if (err instanceof HttpError) {
      const body =
        err.data && typeof err.data === "object"
          ? (err.data as { code?: unknown; error?: unknown })
          : undefined;
      if (err.status === 401 && body?.code === "GCLOUD_AUTH_REQUIRED") {
        throw new TelemetryAuthError(
          typeof body.error === "string"
            ? body.error
            : "Sesión de GKE expirada o sin credenciales activas.",
        );
      }
      throw new Error(
        typeof body?.error === "string"
          ? body.error
          : `Error HTTP ${err.status} consultando telemetría`,
      );
    }
    throw err;
  }
};
