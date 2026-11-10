import {
  createTokenStorage,
  type TokensSesionBase,
} from "./token-storage-factory";

const TOKEN_KEY = "token_sigoo";
const SESION_KEY = "sesion_keycloak";

export interface TokensSesion extends TokensSesionBase {}

const sigooTokenStorage = createTokenStorage<TokensSesion>(
  TOKEN_KEY,
  SESION_KEY,
);

/**
 * Guarda el token corporativo en almacenamiento seguro sin exponerlo en la UI.
 */
export const guardarToken = sigooTokenStorage.guardarToken;

/**
 * Obtiene el token guardado para clientes HTTP futuros.
 */
export const obtenerToken = sigooTokenStorage.obtenerToken;

/**
 * Persiste los tokens de la sesión en la pestaña actual para reanudarla tras
 * una recarga sin depender de cookies de terceros.
 */
export const guardarSesionTokens = sigooTokenStorage.guardarSesionTokens;

/**
 * Recupera los tokens de la pestaña actual, si la sesión sigue vigente.
 */
export const obtenerSesionTokens = sigooTokenStorage.obtenerSesionTokens;

/**
 * Limpia los tokens almacenados al cerrar sesión o cuando dejan de ser válidos.
 */
export const limpiarToken = sigooTokenStorage.limpiarToken;
