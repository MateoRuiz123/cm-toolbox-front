import { safeStorage } from "../lib/safe-storage";
import type { EffectiveUserAccess } from "./access-types";
import { obtenerToken } from "./token";

const ACCESS_BASE_PATH = "/access-api/v1";
const DEV_IMPERSONATE_KEY = "dev_rbac_email";
const WELCOME_LANDING_KEY_PREFIX = "cm-toolbox:welcome-landing:";

export const getLocalWelcomeLandingPreference = (
  email: string,
): boolean | null => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const raw = safeStorage.getItem(`${WELCOME_LANDING_KEY_PREFIX}${normalized}`);
  if (raw === "false") return false;
  if (raw === "true") return true;
  return null;
};

export const setLocalWelcomeLandingPreference = (
  email: string,
  show: boolean,
): void => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  safeStorage.setItem(
    `${WELCOME_LANDING_KEY_PREFIX}${normalized}`,
    show ? "true" : "false",
  );
};

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

export interface UserPreferencesDto {
  readonly userEmail: string;
  readonly showWelcomeLanding: boolean;
  readonly updatedAt: string;
}

/**
 * Actualiza las preferencias personales del usuario autenticado (como mostrar o no la bienvenida).
 */
export const updateMyPreferences = async (payload: {
  readonly showWelcomeLanding: boolean;
}): Promise<UserPreferencesDto> => {
  const response = await fetch(`${ACCESS_BASE_PATH}/me/preferences`, {
    method: "PATCH",
    headers: buildAccessHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let code = "UNKNOWN_ERROR";
    let message = `Error HTTP ${response.status} al guardar preferencias.`;
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

  const parsed = (await response.json()) as { data?: UserPreferencesDto };
  if (!parsed?.data) {
    throw new AccessApiError(
      500,
      "INVALID_PAYLOAD",
      "El servicio de accesos respondió con un formato inválido al guardar preferencias.",
    );
  }
  return parsed.data;
};

/** Consulta conteos de uso por herramienta de forma segura para priorizar atajos en navegación. */
export const fetchUsageCountsSafe = async (
  signal?: AbortSignal,
): Promise<Readonly<Record<string, number>>> => {
  try {
    const response = await fetch(`${ACCESS_BASE_PATH}/apps/usage-ranking`, {
      method: "GET",
      headers: buildAccessHeaders(false),
      signal,
    });
    if (!response.ok) return {};
    const body = (await response.json()) as {
      data?: { counts?: Record<string, number> };
    };
    return body?.data?.counts ?? {};
  } catch {
    return {};
  }
};
