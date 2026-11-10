import { createTokenStorage } from "@/shared/auth/token-storage-factory";

const TOKEN_KEY = "token_docs_cliente";
const SESION_KEY = "sesion_keycloak_docs_cliente";

const clienteTokenStorage = createTokenStorage(TOKEN_KEY, SESION_KEY);

export const guardarTokenCliente = clienteTokenStorage.guardarToken;

export const obtenerTokenCliente = clienteTokenStorage.obtenerToken;

export const guardarSesionCliente = (tokens: {
  token: string;
  refreshToken: string;
}): void => {
  clienteTokenStorage.guardarSesionTokens(tokens);
};

export const limpiarTokenCliente = clienteTokenStorage.limpiarToken;
