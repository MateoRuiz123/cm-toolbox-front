import { useEffect } from "react";
import { useLocation } from "react-router";
import { trackPageView } from "./analytics";

interface RouteMetadata {
  title: string;
  description: string;
}

const METADATA_MAP: Record<string, RouteMetadata> = {
  "/": {
    title: "Portal de Aplicaciones | Coordinadora Toolbox",
    description:
      "Portal centralizado de herramientas operativas, diagnóstico, monitoreo y soporte técnico para los equipos de Coordinadora Mercantil S.A.",
  },
  "/hub": {
    title: "Portal de Aplicaciones | Coordinadora Toolbox",
    description:
      "Portal centralizado de herramientas operativas, diagnóstico, monitoreo y soporte técnico para los equipos de Coordinadora Mercantil S.A.",
  },
  "/diagnostico": {
    title: "Diagnóstico de Migración | Coordinadora Toolbox",
    description:
      "Auditoría y trazabilidad en tiempo real de remisiones y despachos en el flujo de migración hacia CM con checks automáticos y re-migración.",
  },
  "/logs": {
    title: "Visor de Logs GKE | Coordinadora Toolbox",
    description:
      "Auditoría en tiempo real de clusters, namespaces y cargas de trabajo en Kubernetes (Prod y Test) para troubleshooting operativo.",
  },
  "/docs": {
    title: "Documentación de APIs | Coordinadora Toolbox",
    description:
      "Consulta la especificación OpenAPI vigente de las APIs de integración con acceso controlado.",
  },
  "/cliente/login": {
    title: "Acceso clientes | Documentación",
    description:
      "Inicio de sesión para consultar documentación de APIs de integración.",
  },
  "/cliente/docs": {
    title: "Documentación de APIs",
    description: "Catálogo de documentación OpenAPI para clientes.",
  },
  "/admin": {
    title: "Administración y Permisos | Coordinadora Toolbox",
    description:
      "Gobierno de roles jerárquicos, permisos granulares por herramienta, estado de aplicaciones y bitácora de auditoría.",
  },
  "/contacto": {
    title: "Contacto y Soporte TI | Coordinadora Mercantil",
    description:
      "Canales de atención directa, PBX nacional, dirección de sede principal y soporte técnico de Coordinadora Mercantil S.A.",
  },
  "/privacidad": {
    title: "Política de Privacidad y Datos | Coordinadora Mercantil",
    description:
      "Tratamiento de datos personales y normatividad de Habeas Data según la Ley 1581 de 2012 en plataformas de Coordinadora Mercantil.",
  },
  "/terminos": {
    title: "Términos y Condiciones | Coordinadora Mercantil",
    description:
      "Términos y condiciones de uso exclusivo y acceso autorizado a las herramientas del toolbox de Coordinadora Mercantil S.A.",
  },
  "/gracias": {
    title: "Mensaje Enviado con Éxito | Coordinadora Mercantil",
    description:
      "Confirmación de radicación y recepción de consulta técnica o reporte operativo en Coordinadora Mercantil S.A.",
  },
  "/configuracion": {
    title: "Apariencia | Coordinadora Toolbox",
    description:
      "Preferencia visual del toolbox: SIGO Droop o Visitors, combinada con el modo claro u oscuro.",
  },
  "/404": {
    title: "404 - Página no encontrada | Coordinadora Toolbox",
    description:
      "El recurso solicitado no fue encontrado en el portal de herramientas de Coordinadora.",
  },
};

export const usePageTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = pathname.startsWith("/diagnostico")
      ? METADATA_MAP["/diagnostico"]
      : pathname.startsWith("/logs")
        ? METADATA_MAP["/logs"]
        : pathname.startsWith("/docs")
          ? METADATA_MAP["/docs"]
          : pathname.startsWith("/cliente/docs")
            ? METADATA_MAP["/cliente/docs"]
            : METADATA_MAP[pathname] || METADATA_MAP["/404"];

    document.title = meta.title;

    // Actualizar meta description
    let descTag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.name = "description";
      document.head.appendChild(descTag);
    }
    descTag.content = meta.description;

    // Actualizar Open Graph
    const ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    );
    if (ogTitle) ogTitle.content = meta.title;

    const ogDesc = document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]',
    );
    if (ogDesc) ogDesc.content = meta.description;

    const ogUrl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    );
    if (ogUrl) ogUrl.content = window.location.href;

    // Registrar analítica de vista de página
    trackPageView(pathname);
  }, [pathname]);
};
