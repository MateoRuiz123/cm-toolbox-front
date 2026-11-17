import type Keycloak from "keycloak-js";
import { esAuthBypassActivo } from "@/shared/auth/auth-bypass";
import { createClienteKeycloak } from "./cliente-keycloak-client";
import {
  guardarSesionCliente,
  guardarTokenCliente,
  limpiarTokenCliente,
  obtenerTokenCliente,
} from "./cliente-token";

export type ClienteSessionStatus = "authenticated" | "anonymous";

let keycloak: Keycloak | null = null;
let initPromise: Promise<boolean> | null = null;

const clienteRedirectUri = (): string =>
  `${globalThis.location.origin}/cliente/docs`;

const persistTokens = (kc: Keycloak): void => {
  if (!kc.token) {
    return;
  }
  guardarTokenCliente(kc.token);
  if (kc.refreshToken) {
    guardarSesionCliente({
      token: kc.token,
      refreshToken: kc.refreshToken,
    });
  }
};

const wireTokenRefresh = (kc: Keycloak): void => {
  kc.onTokenExpired = () => {
    void kc
      .updateToken(30)
      .then((refreshed) => {
        if (refreshed) {
          persistTokens(kc);
        }
      })
      .catch(() => {
        limpiarTokenCliente();
      });
  };
};

/** Instancia única del client OIDC de clientes (distinto al hub). */
export const getClienteKeycloak = (): Keycloak => {
  if (!keycloak) {
    keycloak = createClienteKeycloak();
  }
  return keycloak;
};

/**
 * Inicializa Keycloak una sola vez (procesa callback `?code=` en `/cliente/docs`).
 * En bypass local solo mira el token de humo en storage.
 */
export const ensureClienteSession = async (): Promise<ClienteSessionStatus> => {
  if (esAuthBypassActivo()) {
    return obtenerTokenCliente() ? "authenticated" : "anonymous";
  }

  const kc = getClienteKeycloak();
  if (!initPromise) {
    initPromise = kc
      .init({
        onLoad: "check-sso",
        pkceMethod: "S256",
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        if (authenticated && kc.token) {
          persistTokens(kc);
          wireTokenRefresh(kc);
          return true;
        }
        return false;
      })
      .catch(() => false);
  }

  const ok = await initPromise;
  if (ok && kc.token) {
    persistTokens(kc);
    return "authenticated";
  }
  if (obtenerTokenCliente()) {
    return "authenticated";
  }
  return "anonymous";
};

/** Dispara login Keycloak (usuario+clave, sin Google) o asigna sesión cliente por NIT en bypass. */
export const loginCliente = async (clientId?: string): Promise<void> => {
  if (esAuthBypassActivo()) {
    const normalized = clientId?.trim();
    guardarTokenCliente(
      normalized && normalized !== "demo"
        ? `dev-cliente-token:${normalized}`
        : "dev-cliente-token",
    );
    return;
  }
  const kc = getClienteKeycloak();
  await ensureClienteSession();
  if (kc.authenticated && kc.token) {
    persistTokens(kc);
    return;
  }
  await kc.login({ redirectUri: clienteRedirectUri() });
};

/** Cierra sesión cliente: limpia storage y logout IdP si aplica. */
export const logoutCliente = async (): Promise<void> => {
  limpiarTokenCliente();
  if (esAuthBypassActivo()) {
    return;
  }
  const kc = keycloak;
  if (!kc) {
    return;
  }
  try {
    await kc.logout({
      redirectUri: `${globalThis.location.origin}/cliente/login`,
    });
  } catch {
    globalThis.location.assign("/cliente/login");
  }
};

/** Reset password vía acción Keycloak (flujo nativo). */
export const resetPasswordCliente = async (): Promise<void> => {
  const kc = getClienteKeycloak();
  if (!initPromise) {
    await kc.init({ checkLoginIframe: false, pkceMethod: "S256" });
    initPromise = Promise.resolve(Boolean(kc.authenticated));
  }
  await kc.login({
    action: "RESET_CREDENTIALS",
    redirectUri: `${globalThis.location.origin}/cliente/login`,
  });
};
