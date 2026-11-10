import { safeSessionStorage, safeStorage } from "../lib/safe-storage";

export interface TokensSesionBase {
  token: string;
  refreshToken: string;
  idToken?: string;
}

export interface TokenStorageManager<
  T extends TokensSesionBase = TokensSesionBase,
> {
  guardarToken: (token?: string | null) => void;
  obtenerToken: () => string | null;
  guardarSesionTokens: (tokens: Partial<T>) => void;
  obtenerSesionTokens: () => T | null;
  limpiarToken: () => void;
}

export const createTokenStorage = <
  T extends TokensSesionBase = TokensSesionBase,
>(
  tokenKey: string,
  sesionKey: string,
): TokenStorageManager<T> => {
  return {
    guardarToken: (token?: string | null): void => {
      if (token?.trim()) {
        safeStorage.setItem(tokenKey, token.trim());
      }
    },
    obtenerToken: (): string | null => safeStorage.getItem(tokenKey),
    guardarSesionTokens: (tokens: Partial<T>): void => {
      if (!tokens.token?.trim() || !tokens.refreshToken?.trim()) {
        return;
      }
      safeSessionStorage.setItem(sesionKey, JSON.stringify(tokens));
    },
    obtenerSesionTokens: (): T | null => {
      const crudo = safeSessionStorage.getItem(sesionKey);
      if (!crudo) return null;
      try {
        const datos = JSON.parse(crudo) as Partial<T>;
        if (!datos.token || !datos.refreshToken) return null;
        return datos as T;
      } catch {
        return null;
      }
    },
    limpiarToken: (): void => {
      safeStorage.removeItem(tokenKey);
      safeSessionStorage.removeItem(sesionKey);
    },
  };
};
