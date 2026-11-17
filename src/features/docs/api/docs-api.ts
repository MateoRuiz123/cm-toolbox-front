import { esAuthBypassActivo } from "@/shared/auth/auth-bypass";
import type {
  DocsApiDetail,
  DocsApiDetailResponse,
  DocsApiSummary,
  DocsCatalogResponse,
  DocsClient,
  DocsClientResponse,
  DocsClientsListResponse,
  DocsCreateApiPayload,
  DocsCreateClientPayload,
  DocsErrorBody,
  DocsPublishResponse,
  DocsSpecVersion,
  DocsVersionsResponse,
} from "./types";
import { getDocsAuthToken } from "./token-provider";

const DOCS_PROXY_PATH = "/docs-api";
const API_BASE = `${DOCS_PROXY_PATH}/v1`;

const CATALOG_TIMEOUT_MS = 15_000;
const OPENAPI_TIMEOUT_MS = 30_000;

export class DocsApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DocsApiError";
    this.status = status;
  }
}

type HeaderOptions = {
  readonly includeJson?: boolean;
  readonly includeManageBypass?: boolean;
  readonly includePublishBypass?: boolean;
};

const resolveDevClienteAudience = (token: string | null): string | null => {
  if (token === "dev-cliente-token") {
    return "client:demo";
  }
  if (token?.startsWith("dev-cliente-token:")) {
    const clientId = token.slice("dev-cliente-token:".length).trim();
    return clientId ? `client:${clientId}` : null;
  }
  return null;
};

const authHeaders = (options: HeaderOptions = {}): HeadersInit => {
  const token = getDocsAuthToken();
  /** Token de humo local de la puerta /cliente → simula audiencia client:<NIT> en el MS. */
  const devClienteAudience = resolveDevClienteAudience(token);
  const isInternalDevBypass = !devClienteAudience && esAuthBypassActivo();
  return {
    Accept: "application/json",
    ...(options.includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token && !devClienteAudience ? { Authorization: `Bearer ${token}` } : {}),
    ...(devClienteAudience ? { "X-Dev-Audiences": devClienteAudience } : {}),
    ...(isInternalDevBypass && options.includeManageBypass
      ? { "X-Dev-Can-Manage": "true" }
      : {}),
    ...(isInternalDevBypass && options.includePublishBypass
      ? { "X-Dev-Can-Publish": "true" }
      : {}),
  };
};

const withTimeout = (ms: number, signal?: AbortSignal): AbortSignal => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }
  controller.signal.addEventListener("abort", () => clearTimeout(timer), {
    once: true,
  });
  return controller.signal;
};

const parseError = async (res: Response, fallback: string): Promise<never> => {
  const data = (await res.json().catch(() => ({}))) as DocsErrorBody;
  throw new DocsApiError(data.message || fallback, res.status);
};

export const fetchDocsCatalog = async (
  signal?: AbortSignal,
): Promise<DocsApiSummary[]> => {
  const res = await fetch(`${API_BASE}/apis`, {
    headers: authHeaders({ includeManageBypass: true }),
    signal: withTimeout(CATALOG_TIMEOUT_MS, signal),
  });
  if (!res.ok) {
    await parseError(
      res,
      "No pudimos cargar la documentación. Intenta de nuevo.",
    );
  }
  const body = (await res.json()) as DocsCatalogResponse;
  if (!Array.isArray(body.data)) {
    throw new DocsApiError("El API respondió sin datos de catálogo.", 500);
  }
  return [...body.data];
};

export const fetchApiDetail = async (
  apiId: string,
  signal?: AbortSignal,
): Promise<DocsApiDetail> => {
  const res = await fetch(`${API_BASE}/apis/${encodeURIComponent(apiId)}`, {
    headers: authHeaders({ includeManageBypass: true }),
    signal: withTimeout(CATALOG_TIMEOUT_MS, signal),
  });
  if (!res.ok) {
    await parseError(
      res,
      res.status === 404
        ? "No se encontró la documentación solicitada."
        : "No pudimos cargar el detalle de la documentación.",
    );
  }
  const body = (await res.json()) as DocsApiDetailResponse;
  return body.data;
};

export const fetchOpenApi = async (
  apiId: string,
  signal?: AbortSignal,
): Promise<unknown> => {
  const res = await fetch(
    `${API_BASE}/apis/${encodeURIComponent(apiId)}/openapi`,
    {
      headers: authHeaders({ includeManageBypass: true }),
      signal: withTimeout(OPENAPI_TIMEOUT_MS, signal),
    },
  );
  if (!res.ok) {
    await parseError(
      res,
      res.status === 404
        ? "No se encontró la documentación solicitada."
        : "No pudimos cargar la documentación. Intenta de nuevo.",
    );
  }
  const body = (await res.json()) as { openapi?: unknown };
  if (typeof body.openapi !== "string") {
    throw new DocsApiError(
      "La especificación recibida no es OpenAPI válida.",
      500,
    );
  }
  return body;
};

export const publishSpec = async (
  apiId: string,
  file: File,
): Promise<DocsPublishResponse["data"]> => {
  const token = getDocsAuthToken();
  const devClienteAudience = resolveDevClienteAudience(token);
  const isInternalDevBypass = !devClienteAudience && esAuthBypassActivo();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${API_BASE}/apis/${encodeURIComponent(apiId)}/specs`,
    {
      method: "POST",
      headers: {
        ...(token && !devClienteAudience ? { Authorization: `Bearer ${token}` } : {}),
        ...(devClienteAudience ? { "X-Dev-Audiences": devClienteAudience } : {}),
        ...(isInternalDevBypass ? { "X-Dev-Can-Publish": "true" } : {}),
      },
      body: form,
    },
  );
  if (!res.ok) {
    await parseError(
      res,
      res.status === 403
        ? "No tienes permiso para publicar."
        : "El archivo no es una especificación OpenAPI válida.",
    );
  }
  const body = (await res.json()) as DocsPublishResponse;
  return body.data;
};

export const createAdminApi = async (
  payload: DocsCreateApiPayload,
): Promise<DocsApiDetail> => {
  const token = getDocsAuthToken();
  const devClienteAudience = resolveDevClienteAudience(token);
  const isInternalDevBypass = !devClienteAudience && esAuthBypassActivo();
  const form = new FormData();
  if (payload.id?.trim()) {
    form.append("id", payload.id.trim());
  }
  form.append("name", payload.name.trim());
  if (payload.description?.trim()) {
    form.append("description", payload.description.trim());
  }
  form.append("audiences", JSON.stringify(payload.audiences));
  form.append("file", payload.file);

  const res = await fetch(`${API_BASE}/admin/apis`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token && !devClienteAudience ? { Authorization: `Bearer ${token}` } : {}),
      ...(devClienteAudience ? { "X-Dev-Audiences": devClienteAudience } : {}),
      ...(isInternalDevBypass ? { "X-Dev-Can-Manage": "true" } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    await parseError(
      res,
      res.status === 403
        ? "No tienes permiso para administrar documentación."
        : res.status === 409
          ? "Ya existe una API con ese identificador."
          : "No fue posible crear la documentación.",
    );
  }
  const body = (await res.json()) as DocsApiDetailResponse;
  return body.data;
};

export type DocsUpdateApiPayload = {
  readonly name?: string;
  readonly description?: string;
  readonly audiences?: readonly string[];
};

/** Actualiza metadatos de una API existente (nombre, descripción y/o audiencias). */
export const updateAdminApi = async (
  apiId: string,
  payload: DocsUpdateApiPayload,
): Promise<DocsApiDetail> => {
  const bodyPayload: Record<string, unknown> = {};
  if (payload.name !== undefined) bodyPayload.name = payload.name;
  if (payload.description !== undefined) {
    bodyPayload.description = payload.description;
  }
  if (payload.audiences !== undefined) {
    bodyPayload.audiences = payload.audiences;
  }

  const res = await fetch(
    `${API_BASE}/admin/apis/${encodeURIComponent(apiId)}`,
    {
      method: "PATCH",
      headers: authHeaders({ includeJson: true, includeManageBypass: true }),
      body: JSON.stringify(bodyPayload),
    },
  );
  if (!res.ok) {
    await parseError(
      res,
      res.status === 403
        ? "No tienes permiso para administrar documentación."
        : "No fue posible actualizar la documentación.",
    );
  }
  const body = (await res.json()) as DocsApiDetailResponse;
  return body.data;
};

/** @deprecated Usa `updateAdminApi`. */
export const updateAdminApiAudiences = async (
  apiId: string,
  audiences: readonly string[],
): Promise<DocsApiDetail> => updateAdminApi(apiId, { audiences });

export const fetchApiVersions = async (
  apiId: string,
  signal?: AbortSignal,
): Promise<DocsSpecVersion[]> => {
  const res = await fetch(
    `${API_BASE}/apis/${encodeURIComponent(apiId)}/versions`,
    {
      headers: authHeaders({ includeManageBypass: true }),
      signal: withTimeout(CATALOG_TIMEOUT_MS, signal),
    },
  );
  if (!res.ok) {
    await parseError(
      res,
      "No fue posible cargar el historial de versiones.",
    );
  }
  const body = (await res.json()) as DocsVersionsResponse;
  return Array.isArray(body.data) ? [...body.data] : [];
};

export const restoreApiVersion = async (
  apiId: string,
  version: string,
): Promise<DocsPublishResponse["data"]> => {
  const res = await fetch(
    `${API_BASE}/apis/${encodeURIComponent(apiId)}/versions/${encodeURIComponent(version)}/restore`,
    {
      method: "POST",
      headers: authHeaders({
        includeManageBypass: true,
        includePublishBypass: true,
      }),
    },
  );
  if (!res.ok) {
    await parseError(res, "No fue posible restaurar esa versión.");
  }
  const body = (await res.json()) as DocsPublishResponse;
  return body.data;
};

export const deleteAdminApi = async (apiId: string): Promise<void> => {
  const res = await fetch(
    `${API_BASE}/admin/apis/${encodeURIComponent(apiId)}`,
    {
      method: "DELETE",
      headers: authHeaders({ includeManageBypass: true }),
    },
  );
  if (!res.ok) {
    await parseError(res, "No fue posible eliminar la documentación.");
  }
};

export const fetchAdminClients = async (
  signal?: AbortSignal,
): Promise<DocsClient[]> => {
  const res = await fetch(`${API_BASE}/admin/clients`, {
    headers: authHeaders({ includeManageBypass: true }),
    signal: withTimeout(CATALOG_TIMEOUT_MS, signal),
  });
  if (!res.ok) {
    await parseError(res, "No fue posible cargar la lista de clientes.");
  }
  const body = (await res.json()) as DocsClientsListResponse;
  return Array.isArray(body.data) ? [...body.data] : [];
};

export const createAdminClient = async (
  payload: DocsCreateClientPayload,
): Promise<DocsClient> => {
  const res = await fetch(`${API_BASE}/admin/clients`, {
    method: "POST",
    headers: authHeaders({ includeJson: true, includeManageBypass: true }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await parseError(res, "No fue posible registrar el cliente.");
  }
  const body = (await res.json()) as DocsClientResponse;
  return body.data;
};

export const claimClientActivationLink = async (payload: {
  readonly clientId: string;
  readonly activationToken: string;
  readonly expiresAt?: string | null;
}): Promise<{ readonly valid: boolean; readonly claimToken?: string }> => {
  const res = await fetch(`${API_BASE}/clients/activation/open`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: payload.clientId,
      activationToken: payload.activationToken,
      ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
    }),
  });
  if (!res.ok) {
    await parseError(
      res,
      "Este enlace de activación ya fue utilizado y se encuentra inhabilitado.",
    );
  }
  const body = (await res.json()) as {
    readonly data: { readonly valid: boolean; readonly claimToken?: string };
  };
  return body.data;
};

export const activateClientAccount = async (payload: {
  readonly clientId: string;
  readonly activationToken: string;
  readonly claimToken?: string | null;
  readonly expiresAt?: string | null;
  readonly password?: string;
}): Promise<DocsClient> => {
  const res = await fetch(`${API_BASE}/clients/activate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: payload.clientId,
      activationToken: payload.activationToken,
      ...(payload.claimToken ? { claimToken: payload.claimToken } : {}),
      ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
      ...(payload.password !== undefined ? { password: payload.password } : {}),
    }),
  });
  if (!res.ok) {
    await parseError(
      res,
      "No fue posible activar la cuenta con este enlace.",
    );
  }
  const body = (await res.json()) as DocsClientResponse;
  return body.data;
};

export const resendClientActivation = async (
  clientId: string,
): Promise<{ activationUrl?: string; emailSent: boolean }> => {
  const res = await fetch(
    `${API_BASE}/admin/clients/${encodeURIComponent(clientId)}/activation`,
    {
      method: "POST",
      headers: authHeaders({ includeManageBypass: true }),
    },
  );
  if (!res.ok) {
    await parseError(res, "No fue posible reenviar el enlace de activación.");
  }
  const headerUrl = res.headers.get("X-Activation-Url") ?? undefined;
  const emailSent = res.headers.get("X-Email-Sent") === "true";
  return { activationUrl: headerUrl, emailSent };
};

export const updateAdminClientStatus = async (
  clientId: string,
  status: "active" | "disabled",
): Promise<DocsClient> => {
  const res = await fetch(
    `${API_BASE}/admin/clients/${encodeURIComponent(clientId)}`,
    {
      method: "PATCH",
      headers: authHeaders({ includeJson: true, includeManageBypass: true }),
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) {
    await parseError(res, "No fue posible actualizar el estado del cliente.");
  }
  const body = (await res.json()) as DocsClientResponse;
  return body.data;
};

export const fetchClienteProfile = async (
  signal?: AbortSignal,
): Promise<DocsClient> => {
  const res = await fetch(`${API_BASE}/me`, {
    headers: authHeaders(),
    signal: withTimeout(CATALOG_TIMEOUT_MS, signal),
  });
  if (!res.ok) {
    await parseError(res, "No pudimos cargar tu perfil.");
  }
  const body = (await res.json()) as DocsClientResponse;
  return body.data;
};

export const updateClienteProfile = async (payload: {
  readonly name?: string;
  readonly email?: string;
}): Promise<DocsClient> => {
  const res = await fetch(`${API_BASE}/me`, {
    method: "PATCH",
    headers: authHeaders({ includeJson: true }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await parseError(res, "No pudimos guardar los cambios del perfil.");
  }
  const body = (await res.json()) as DocsClientResponse;
  return body.data;
};
