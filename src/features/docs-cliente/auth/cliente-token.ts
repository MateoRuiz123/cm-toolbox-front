import { safeSessionStorage, safeStorage } from "@/shared/lib/safe-storage";

const TOKEN_KEY = "token_docs_cliente";
const SESION_KEY = "sesion_keycloak_docs_cliente";

export const guardarTokenCliente = (token?: string | null): void => {
  if (token?.trim()) {
    safeStorage.setItem(TOKEN_KEY, token.trim());
  }
};

export const obtenerTokenCliente = (): string | null =>
  safeStorage.getItem(TOKEN_KEY);

export const guardarSesionCliente = (tokens: {
  token: string;
  refreshToken: string;
}): void => {
  safeSessionStorage.setItem(SESION_KEY, JSON.stringify(tokens));
};

export const limpiarTokenCliente = (): void => {
  safeStorage.removeItem(TOKEN_KEY);
  safeSessionStorage.removeItem(SESION_KEY);
};
