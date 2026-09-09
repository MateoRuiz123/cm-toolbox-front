import type { DetalleErrorAuth } from "./types";

const extraerMensaje = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const posible = error as {
      error_description?: string;
      error?: string;
      message?: string;
    };
    return posible.error_description ?? posible.error ?? posible.message ?? "";
  }
  return "";
};

/**
 * Traduce un error técnico de Keycloak o del servicio de permisos a un
 * diagnóstico entendible, con las acciones concretas que resuelven el bloqueo.
 */
export const describirErrorAuth = (
  error: unknown,
  origen: "keycloak" | "permisos" = "keycloak",
): DetalleErrorAuth => {
  const mensaje = extraerMensaje(error);
  const detalleTecnico = mensaje || "Sin detalle técnico disponible";

  if (mensaje.includes("3rd party check iframe")) {
    return {
      codigo: "cookies_bloqueadas",
      titulo: "El navegador bloquea las cookies de terceros",
      descripcion:
        "Keycloak no pudo verificar la sesión porque el navegador impidió el acceso al almacenamiento del dominio de autenticación.",
      sugerencias: [
        "Permite las cookies de terceros para cmautenticacion-*.coordinadora.com en la configuración del sitio.",
        'En Firefox, baja la Protección contra rastreo a "Estándar" para localhost.',
        "Vuelve a intentar el inicio de sesión después de aplicar el cambio.",
      ],
      detalleTecnico,
    };
  }

  if (
    mensaje.includes("Failed to fetch") ||
    mensaje.includes("NetworkError") ||
    mensaje.includes("CORS") ||
    mensaje.includes("Load failed")
  ) {
    return {
      codigo: "red_o_cors",
      titulo:
        origen === "permisos"
          ? "No se pudo consultar el servicio de permisos"
          : "No se pudo contactar al servidor de autenticación",
      descripcion:
        "La petición fue rechazada por la red o por la política de origen cruzado (CORS) del servidor.",
      sugerencias: [
        "Verifica que la VPN o la red corporativa esté activa.",
        "Confirma que el origen http://localhost:3000 esté registrado en Web Origins del cliente de Keycloak.",
        "Revisa la pestaña Red del navegador para ver la petición rechazada.",
      ],
      detalleTecnico,
    };
  }

  if (
    mensaje.includes("redirect_uri") ||
    mensaje.includes("invalid_client") ||
    mensaje.includes("unauthorized_client")
  ) {
    return {
      codigo: "configuracion",
      titulo:
        "La configuración del cliente de Keycloak no permite esta aplicación",
      descripcion:
        "El servidor rechazó la solicitud porque la URL de retorno o el identificador de cliente no están habilitados.",
      sugerencias: [
        "Registra http://localhost:3000/* en Valid Redirect URIs del cliente.",
        "Confirma que VITE_KEYCLOAK_ENV apunte al ambiente donde existe tu usuario.",
      ],
      detalleTecnico,
    };
  }

  if (mensaje.includes("Timeout")) {
    return {
      codigo: "red_o_cors",
      titulo: "El servidor de autenticación no respondió a tiempo",
      descripcion:
        "La verificación de la sesión superó el tiempo de espera antes de recibir respuesta.",
      sugerencias: [
        "Verifica que la VPN o la red corporativa esté activa.",
        "Reintenta el inicio de sesión en unos segundos.",
      ],
      detalleTecnico,
    };
  }

  return {
    codigo: "desconocido",
    titulo:
      origen === "permisos"
        ? "Falló la validación de permisos"
        : "Falló la autenticación corporativa",
    descripcion:
      "Ocurrió un error inesperado durante el proceso de autenticación. El detalle técnico ayuda a identificar la causa.",
    sugerencias: [
      "Reintenta el inicio de sesión.",
      "Si persiste, comparte el detalle técnico con soporte de arquitectura.",
    ],
    detalleTecnico,
  };
};
