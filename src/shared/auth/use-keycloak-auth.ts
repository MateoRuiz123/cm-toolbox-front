import { useCallback, useEffect, useState } from "react";
import type Keycloak from "keycloak-js";
import {
  useLoginKeycloak,
  type TUsuarioKeycloak,
} from "@itcoordinadora/cm-sigoo-temp-ui";
import type { DetalleErrorAuth, EstadoAuth, SesionCorporativa } from "./types";
import { ensureKeycloakInit } from "./keycloak-init";
import { guardarSesionTokens, guardarToken, limpiarToken } from "./token";
import {
  obtenerSnapshotPreferencias,
  restaurarSnapshotPreferencias,
} from "../lib/ui-preferences";

export const extraerIdentidadToken = (
  keycloak: Pick<Keycloak, "idTokenParsed" | "token">,
): {
  estadoAuth: EstadoAuth;
  email: string;
  terminal: string | number;
} => {
  const token = keycloak.idTokenParsed as
    | (TUsuarioKeycloak & {
        terminal?: string | number;
        preferred_username?: string;
      })
    | undefined;
  const emailToken = String(
    token?.email ?? token?.preferred_username ?? "",
  ).trim();

  if (!emailToken) {
    console.warn(
      "[Auth] El token de Keycloak no contiene correo ni preferred_username",
    );
    return { estadoAuth: "sin_acceso", email: "", terminal: "" };
  }

  const terminalToken = token?.terminal;
  const terminalVal =
    typeof terminalToken === "string" || typeof terminalToken === "number"
      ? terminalToken
      : "";

  guardarToken(keycloak.token);
  return {
    estadoAuth: "autenticado",
    email: emailToken,
    terminal: terminalVal,
  };
};

const attachKeycloakListeners = (
  kc: Keycloak,
  onSuccess: () => void,
  onExpired: () => void,
) => {
  kc.onAuthSuccess = onSuccess;
  kc.onTokenExpired = onExpired;
};

/**
 * Hook para gestionar la sesión corporativa con Keycloak (Google IdP).
 * Autenticación directa con el token emitido por Keycloak.
 */
export const useKeycloakAuth = (): SesionCorporativa => {
  const keycloak = useLoginKeycloak() as unknown as Keycloak;

  const [estadoAuth, setEstadoAuth] = useState<EstadoAuth>("inicializando");
  const [email, setEmail] = useState("");
  const [terminal, setTerminal] = useState<string | number>("");
  const [errorAuth, setErrorAuth] = useState<DetalleErrorAuth | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const handleAuthSuccess = () => {
      console.info("[Auth] Evento onAuthSuccess recibido de Keycloak.");
      setIntento((valor) => valor + 1);
    };

    const handleTokenExpired = () => {
      console.info("[Auth] Token corporativo expirado, renovando...");
      keycloak
        .updateToken(30)
        .then((renovado) => {
          if (renovado) {
            guardarSesionTokens({
              token: keycloak.token ?? "",
              refreshToken: keycloak.refreshToken ?? "",
              idToken: keycloak.idToken,
            });
            guardarToken(keycloak.token);
          }
        })
        .catch((error) => {
          console.warn("[Auth] No se pudo renovar el token:", error);
          limpiarToken();
          setEstadoAuth("sin_sesion");
        });
    };

    attachKeycloakListeners(keycloak, handleAuthSuccess, handleTokenExpired);
  }, [keycloak]);

  useEffect(() => {
    let cancelado = false;

    const validarSesion = async () => {
      console.info("[Auth] Validando sesión corporativa en Keycloak...");
      const { autenticado, error } = await ensureKeycloakInit(keycloak);
      if (cancelado) return;

      if (error) {
        console.error("[Auth] Error de inicialización en Keycloak:", error);
        setErrorAuth(error);
        setEstadoAuth("error");
        return;
      }

      if (!autenticado) {
        console.info("[Auth] Sin sesión corporativa previa.");
        setEstadoAuth("sin_sesion");
        return;
      }

      console.info("[Auth] Sesión en Keycloak autenticada correctamente.");
      guardarSesionTokens({
        token: keycloak.token ?? "",
        refreshToken: keycloak.refreshToken ?? "",
        idToken: keycloak.idToken,
      });

      const identidad = extraerIdentidadToken(keycloak);
      if (cancelado) return;

      setEmail(identidad.email);
      setTerminal(identidad.terminal);
      setEstadoAuth(identidad.estadoAuth);
    };

    void validarSesion();

    return () => {
      cancelado = true;
    };
  }, [keycloak, intento]);

  const iniciarSesion = useCallback(async () => {
    console.info("[Auth] Redirigiendo a Google Identity Provider...");
    await keycloak.login({
      idpHint: "google",
    });
  }, [keycloak]);

  // RN-A7 / CA-007: el storage local de auth se limpia antes de delegar el cierre al IdP, preservando preferencias visuales del usuario.
  const cerrarSesion = useCallback(() => {
    console.info("[Auth] Cerrando sesión y limpiando almacenamiento...");
    const snapshotPrefs = obtenerSnapshotPreferencias();
    limpiarToken();
    localStorage.clear();
    sessionStorage.clear();
    restaurarSnapshotPreferencias(snapshotPrefs);

    try {
      keycloak.logout();
    } catch (error) {
      console.warn("No se pudo cerrar sesión en el IdP, recargando", error);
      window.location.reload();
    }
  }, [keycloak]);

  const reintentar = useCallback(() => {
    if (keycloak.authenticated) {
      setErrorAuth(null);
      setEstadoAuth("inicializando");
      setIntento((valor) => valor + 1);
      return;
    }

    limpiarToken();
    window.location.reload();
  }, [keycloak]);

  return {
    estadoAuth,
    email,
    terminal,
    errorAuth,
    cerrarSesion,
    iniciarSesion,
    reintentar,
  };
};
