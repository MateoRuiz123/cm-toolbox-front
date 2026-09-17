import { useMemo } from "react";
import type { SesionCorporativa } from "./types";

const DEV_EMAIL = "dev.local@coordinadora.com";
const DEV_TERMINAL = "local";

/**
 * Sesión mock para desarrollo local. No habla con Keycloak ni persiste tokens.
 */
export const useDevAuth = (): SesionCorporativa =>
  useMemo(
    () => ({
      estadoAuth: "autenticado",
      email: DEV_EMAIL,
      terminal: DEV_TERMINAL,
      errorAuth: null,
      iniciarSesion: async () => undefined,
      reintentar: () => undefined,
      cerrarSesion: () => undefined,
    }),
    [],
  );
