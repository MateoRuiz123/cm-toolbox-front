import type Keycloak from "keycloak-js";
import { describirErrorAuth } from "./auth-errors";
import { limpiarToken, obtenerSesionTokens } from "./token";
import type { DetalleErrorAuth } from "./types";

export interface ResultadoInitKeycloak {
  autenticado: boolean;
  error: DetalleErrorAuth | null;
}

const initPromises = new WeakMap<Keycloak, Promise<ResultadoInitKeycloak>>();

// Sin `onLoad` ni `silentCheckSsoRedirectUri`: ambos obligan a Keycloak a cargar
// un iframe hacia 3p-cookies/step1.html, que los navegadores con protección de
// rastreo bloquean y hacen fallar el init antes de procesar el código de retorno.
const opcionesBase = {
  pkceMethod: "S256",
  flow: "standard",
  checkLoginIframe: false,
  enableLogging: import.meta.env.DEV,
} as const;

/**
 * Inicializa la instancia de Keycloak una sola vez de forma idempotente,
 * reanudando la sesión de la pestaña cuando existen tokens vigentes.
 */
export const ensureKeycloakInit = async (
  keycloak: Keycloak,
): Promise<ResultadoInitKeycloak> => {
  // 1. Si hay una inicialización en curso o completada, reutilizar la misma promesa.
  // Es vital verificar `initPromises` ANTES de `keycloak.didInitialize`, ya que keycloak-js
  // establece `didInitialize = true` de forma síncrona al comenzar su ejecución, mucho antes
  // de intercambiar el código por tokens.
  const enVuelo = initPromises.get(keycloak);
  if (enVuelo) {
    const res = await enVuelo;
    return {
      autenticado: Boolean(keycloak.authenticated ?? res.autenticado),
      error: res.error,
    };
  }

  // 2. Si ya fue inicializada fuera de este helper (p. ej. en tests unitarios con mocks)
  if (keycloak.didInitialize) {
    return { autenticado: Boolean(keycloak.authenticated), error: null };
  }

  const promesaInit = (async (): Promise<ResultadoInitKeycloak> => {
    const sesionPrevia = obtenerSesionTokens();
    console.info("[Auth] Iniciando conexión con Keycloak...", {
      reanudandoSesion: Boolean(sesionPrevia),
    });

    try {
      const autenticado = await keycloak.init({
        ...opcionesBase,
        ...(sesionPrevia ?? {}),
      });
      console.info("[Auth] Conexión con Keycloak completada:", {
        autenticado: Boolean(autenticado),
        didInitialize: keycloak.didInitialize,
      });
      return { autenticado: Boolean(autenticado), error: null };
    } catch (error) {
      // Si la sesión guardada caducó, se descarta para permitir un login limpio.
      if (sesionPrevia) {
        console.warn(
          "[Auth] Sesión previa en almacenamiento local rechazada o caducada. Limpiando tokens...",
          error,
        );
        limpiarToken();
        return { autenticado: false, error: null };
      }

      console.error("[Auth] Error al inicializar Keycloak:", error);
      return {
        autenticado: false,
        error: describirErrorAuth(error, "keycloak"),
      };
    }
  })();

  initPromises.set(keycloak, promesaInit);
  return promesaInit;
};
