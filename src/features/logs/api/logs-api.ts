import type {
  LogEnvironment,
  LogStreamMessage,
  WorkloadInfo,
} from "./logs-types";
import { obtenerToken } from "@/shared/auth/token";

/** Prefijo same-origin; nginx (prod) y Vite (dev) lo enrutan a cm-logs-ms. */
const LOGS_PROXY_PATH = "/logs-api";
const API_URL = `${LOGS_PROXY_PATH}/api`;

const buildWsUrl = (): string => {
  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${globalThis.location.host}${LOGS_PROXY_PATH}/`;
};
let messageSequence = 0;

const authHeaders = (includeJson = false): HeadersInit => {
  const token = obtenerToken();
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export class LogsApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "LogsApiError";
    this.status = status;
    this.code = code;
  }
}

const parseApiError = async (
  res: Response,
  fallback: string,
): Promise<never> => {
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };
  throw new LogsApiError(data.error || fallback, res.status, data.code);
};

export type { LogEnvironment, LogStreamMessage, WorkloadInfo };

export const authCluster = async (
  env: LogEnvironment,
): Promise<{ ok: boolean; label: string }> => {
  const res = await fetch(`${API_URL}/auth`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ env }),
  });
  if (!res.ok) {
    await parseApiError(res, "Error autenticando clusters");
  }
  return res.json() as Promise<{ ok: boolean; label: string }>;
};

export const fetchNamespaces = async (
  env: LogEnvironment,
): Promise<string[]> => {
  const res = await fetch(
    `${API_URL}/namespaces?env=${encodeURIComponent(env)}`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    await parseApiError(res, "Error al cargar namespaces");
  }
  return res.json() as Promise<string[]>;
};

export const fetchWorkloads = async (
  env: LogEnvironment,
  namespace: string,
  search?: string,
): Promise<WorkloadInfo[]> => {
  const params = new URLSearchParams({ env });
  if (namespace && namespace !== "__all__") {
    const [cluster, ns] = namespace.split("|");
    if (cluster) params.set("cluster", cluster);
    if (ns) params.set("namespace", ns);
  }
  if (search?.trim()) {
    params.set("q", search.trim());
  }
  const res = await fetch(`${API_URL}/workloads?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    await parseApiError(res, "Error al cargar workloads");
  }
  return res.json() as Promise<WorkloadInfo[]>;
};

export const logoutGcloudSession = async (): Promise<{ ok: boolean }> => {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(true),
  })
  if (!res.ok) {
    await parseApiError(res, 'Error al cerrar sesión GCP')
  }
  return res.json() as Promise<{ ok: boolean }>
}

export const createLogsWebSocket = (): WebSocket => new WebSocket(buildWsUrl());

/** Envía el access token como primer mensaje; nunca lo expone en la URL del socket. */
export const authenticateLogsWebSocket = (ws: WebSocket): void => {
  ws.send(JSON.stringify({ action: "authenticate", token: obtenerToken() ?? "" }));
};

export const parseLogStreamMessage = (raw: string): LogStreamMessage | null => {
  try {
    const parsed = JSON.parse(raw) as Omit<LogStreamMessage, "id" | "timestamp">;
    const timestamp = Date.now();
    messageSequence += 1;
    return {
      ...parsed,
      id: `${timestamp}-${messageSequence}`,
      timestamp,
    };
  } catch {
    return null;
  }
};

export const isGcloudAuthRequired = (err: unknown): boolean =>
  err instanceof LogsApiError &&
  err.status === 401 &&
  err.code === "GCLOUD_AUTH_REQUIRED";
