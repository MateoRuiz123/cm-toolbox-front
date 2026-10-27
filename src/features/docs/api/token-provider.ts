import { obtenerToken } from "@/shared/auth/token";

type TokenProvider = () => string | null;

let provider: TokenProvider = obtenerToken;

/** Permite a la puerta /cliente inyectar su Bearer sin mezclar sesiones. */
export const setDocsAuthTokenProvider = (next: TokenProvider): void => {
  provider = next;
};

export const resetDocsAuthTokenProvider = (): void => {
  provider = obtenerToken;
};

export const getDocsAuthToken = (): string | null => provider();
