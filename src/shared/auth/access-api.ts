import { safeStorage } from "../lib/safe-storage";
import type { EffectiveUserAccess } from "./access-types";
import { obtenerToken } from "./token";

const ACCESS_BASE_PATH = "/access-api/v1";
const DEV_IMPERSONATE_KEY = "dev_rbac_email";

export class AccessApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AccessApiError";
    this.status = status;
    this.code = code;
  }
}

export const getDevImpersonatedEmail = (): string | null =>
  safeStorage.getItem(DEV_IMPERSONATE_KEY);

export const setDevImpersonatedEmail = (email: string | null): void => {
  if (!email?.trim()) {
    safeStorage.removeItem(DEV_IMPERSONATE_KEY);
    return;
  }
  safeStorage.setItem(DEV_IMPERSONATE_KEY, email.trim().toLowerCase());
};

export const buildAccessHeaders = (
  includeJsonContentType = false,
): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  const token = obtenerToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const devEmail = getDevImpersonatedEmail();
  if (devEmail) {
    headers["x-dev-user-email"] = devEmail;
  }

  return headers;
};

/**
 * Consulta el perfil efectivo del usuario autenticado en cm-toolbox-access-ms.
 */
export const fetchMyAccess = async (
  signal?: AbortSignal,
): Promise<EffectiveUserAccess> => {
  const response = await fetch(`${ACCESS_BASE_PATH}/me/access`, {
    method: "GET",
    headers: buildAccessHeaders(false),
    signal,
  });

  if (!response.ok) {
    let code = "UNKNOWN_ERROR";
    let message = `Error HTTP ${response.status} al consultar permisos.`;
    try {
      const body = (await response.json()) as {
        code?: string;
        message?: string;
      };
      if (body.code) code = body.code;
      if (body.message) message = body.message;
    } catch {
      // Ignorar fallo de parseo JSON
    }
    throw new AccessApiError(response.status, code, message);
  }

  const payload = (await response.json()) as { data?: EffectiveUserAccess };
  if (!payload?.data) {
    throw new AccessApiError(
      500,
      "INVALID_PAYLOAD",
      "El servicio de accesos respondió con un formato inválido.",
    );
  }

  return payload.data;
};
