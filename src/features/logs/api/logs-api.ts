import type {
  LogEnvironment,
  LogStreamMessage,
  WorkloadInfo,
} from "./logs-types";
import { createHttpClient, HttpError } from "@/shared/api/http-client";
import { obtenerToken } from "@/shared/auth/token";

/** Prefijo same-origin; nginx (prod) y Vite (dev) lo enrutan a cm-logs-ms. */
const LOGS_PROXY_PATH = "/logs-api";
const API_URL = `${LOGS_PROXY_PATH}/api`;

const logsHttp = createHttpClient(API_URL);

const buildWsUrl = (): string => {
  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${globalThis.location.host}${LOGS_PROXY_PATH}/`;
};
let messageSequence = 0;

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

const toLogsApiError = (error: unknown, fallback: string): LogsApiError => {
  if (error instanceof LogsApiError) {
    return error;
  }
  if (error instanceof HttpError) {
    const data =
      error.data && typeof error.data === "object"
        ? (error.data as { error?: unknown; code?: unknown })
        : undefined;
    const messageFromBody =
      typeof data?.error === "string" ? data.error : undefined;
    const codeFromBody = typeof data?.code === "string" ? data.code : undefined;
    return new LogsApiError(
      messageFromBody || error.message || fallback,
      error.status,
      codeFromBody || error.code,
    );
  }
  return new LogsApiError(error instanceof Error ? error.message : fallback, 0);
};

const withLogsError = async <T>(
  action: () => Promise<T>,
  fallback: string,
): Promise<T> => {
  try {
    return await action();
  } catch (error) {
    throw toLogsApiError(error, fallback);
  }
};

export type { LogEnvironment, LogStreamMessage, WorkloadInfo };

export const authCluster = async (
  env: LogEnvironment,
): Promise<{ ok: boolean; label: string }> =>
  withLogsError(
    () => logsHttp.post<{ ok: boolean; label: string }>("/auth", { env }),
    "Error autenticando clusters",
  );

export const fetchNamespaces = async (env: LogEnvironment): Promise<string[]> =>
  withLogsError(
    () => logsHttp.get<string[]>(`/namespaces?env=${encodeURIComponent(env)}`),
    "Error al cargar namespaces",
  );

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
  return withLogsError(
    () => logsHttp.get<WorkloadInfo[]>(`/workloads?${params.toString()}`),
    "Error al cargar workloads",
  );
};

export const logoutGcloudSession = async (): Promise<{ ok: boolean }> =>
  withLogsError(
    () => logsHttp.post<{ ok: boolean }>("/auth/logout"),
    "Error al cerrar sesión GCP",
  );

export const createLogsWebSocket = (): WebSocket => new WebSocket(buildWsUrl());

/** Envía el access token como primer mensaje; nunca lo expone en la URL del socket. */
export const authenticateLogsWebSocket = (ws: WebSocket): void => {
  ws.send(
    JSON.stringify({ action: "authenticate", token: obtenerToken() ?? "" }),
  );
};

export const parseLogStreamMessage = (raw: string): LogStreamMessage | null => {
  try {
    const parsed = JSON.parse(raw) as Omit<
      LogStreamMessage,
      "id" | "timestamp"
    >;
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
