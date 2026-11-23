import type { ComponentType } from "react";
import { resolvePath, type To } from "react-router";

type RouteModule<T extends ComponentType<never>> = {
  readonly default: T;
};

type RouteLoader<T extends ComponentType<never>> = () => Promise<RouteModule<T>>;

export type RouteLoaderKey =
  | "corporateKeycloakProvider"
  | "hub"
  | "notFound"
  | "diagnostico"
  | "logs"
  | "backends"
  | "admin"
  | "contact"
  | "thankYou"
  | "privacy"
  | "terms"
  | "configuracion"
  | "welcomeLanding"
  | "internalDocs"
  | "internalDocsViewer"
  | "docsAdmin"
  | "docsNewApi"
  | "docsClients"
  | "clienteLogin"
  | "clienteDocs";

const loadedRouteKeys = new Set<RouteLoaderKey>();
const resolvedComponents = new Map<RouteLoaderKey, ComponentType<never>>();
const inflightPreloads = new Map<RouteLoaderKey, Promise<unknown>>();

const createTrackedLoader = <T extends ComponentType<never>>(
  key: RouteLoaderKey,
  rawLoader: RouteLoader<T>,
): RouteLoader<T> => {
  return () => {
    const existing = inflightPreloads.get(key) as
      | Promise<RouteModule<T>>
      | undefined;
    if (existing) {
      return existing;
    }

    const request = rawLoader()
      .then((mod) => {
        loadedRouteKeys.add(key);
        resolvedComponents.set(key, mod.default);
        return mod;
      })
      .finally(() => {
        inflightPreloads.delete(key);
      });

    inflightPreloads.set(key, request);
    return request;
  };
};

/**
 * Mapa centralizado de loaders dinámicos para compartir chunks exactos entre `lazy()` y precarga.
 */
export const ROUTE_LOADERS = {
  corporateKeycloakProvider: createTrackedLoader("corporateKeycloakProvider", () =>
    import("../auth/corporate-keycloak-provider").then((m) => ({
      default: m.CorporateKeycloakProvider,
    })),
  ),
  hub: createTrackedLoader("hub", () =>
    import("../../features/hub/hub-page").then((m) => ({
      default: m.HubPage,
    })),
  ),
  notFound: createTrackedLoader("notFound", () =>
    import("../../features/not-found/not-found-page").then((m) => ({
      default: m.NotFoundPage,
    })),
  ),
  diagnostico: createTrackedLoader("diagnostico", () =>
    import("../../features/diagnostico/diagnostico-page").then((m) => ({
      default: m.DiagnosticoPage,
    })),
  ),
  logs: createTrackedLoader("logs", () =>
    import("../../features/logs/logs-page").then((m) => ({
      default: m.LogsPage,
    })),
  ),
  backends: createTrackedLoader("backends", () =>
    import("../../features/backends/backends-page").then((m) => ({
      default: m.BackendsPage,
    })),
  ),
  admin: createTrackedLoader("admin", () =>
    import("../../features/admin/admin-page").then((m) => ({
      default: m.AdminPage,
    })),
  ),
  contact: createTrackedLoader("contact", () =>
    import("../../features/contact/contact-page").then((m) => ({
      default: m.ContactPage,
    })),
  ),
  thankYou: createTrackedLoader("thankYou", () =>
    import("../../features/feedback/thank-you-page").then((m) => ({
      default: m.ThankYouPage,
    })),
  ),
  privacy: createTrackedLoader("privacy", () =>
    import("../../features/legal/privacy-page").then((m) => ({
      default: m.PrivacyPage,
    })),
  ),
  terms: createTrackedLoader("terms", () =>
    import("../../features/legal/terms-page").then((m) => ({
      default: m.TermsPage,
    })),
  ),
  configuracion: createTrackedLoader("configuracion", () =>
    import("../../features/configuracion/configuracion-page").then((m) => ({
      default: m.ConfiguracionPage,
    })),
  ),
  welcomeLanding: createTrackedLoader("welcomeLanding", () =>
    import("../../features/welcome/welcome-landing-page").then((m) => ({
      default: m.WelcomeLandingPage,
    })),
  ),
  internalDocs: createTrackedLoader("internalDocs", () =>
    import("../../features/docs/internal-docs-pages").then((m) => ({
      default: m.InternalDocsPage,
    })),
  ),
  internalDocsViewer: createTrackedLoader("internalDocsViewer", () =>
    import("../../features/docs/internal-docs-pages").then((m) => ({
      default: m.InternalDocsViewerPage,
    })),
  ),
  docsAdmin: createTrackedLoader("docsAdmin", () =>
    import("../../features/docs/admin/docs-admin-page").then((m) => ({
      default: m.DocsAdminPage,
    })),
  ),
  docsNewApi: createTrackedLoader("docsNewApi", () =>
    import("../../features/docs/admin/new-api-form").then((m) => ({
      default: m.DocsNewApiPage,
    })),
  ),
  docsClients: createTrackedLoader("docsClients", () =>
    import("../../features/docs/admin/clients-page").then((m) => ({
      default: m.ClientsPage,
    })),
  ),
  clienteLogin: createTrackedLoader("clienteLogin", () =>
    import("../../features/docs-cliente/cliente-login-page").then((m) => ({
      default: m.ClienteLoginPage,
    })),
  ),
  clienteDocs: createTrackedLoader("clienteDocs", () =>
    import("../../features/docs-cliente/cliente-docs-routes").then((m) => ({
      default: m.ClienteDocsRoutes,
    })),
  ),
} as const;

const normalizePathname = (pathname: string): string => {
  if (!pathname) return "/";
  const cleaned =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return cleaned || "/";
};

/**
 * Resuelve cualquier destino `To` relativo o absoluto hacia su pathname normalizado sin query ni hash.
 */
export const extractPathnameFromTo = (
  to: To,
  currentPathname = "/",
): string => {
  const resolved = resolvePath(to, currentPathname);
  return normalizePathname(resolved.pathname);
};

/** Resuelve la clave de loader asociada a un pathname de ruta conocido. */
export const resolveRouteLoaderKey = (
  pathname: string,
): RouteLoaderKey | null => {
  const normalized = normalizePathname(pathname);

  if (normalized === "/" || normalized === "/hub") return "hub";
  if (normalized === "/diagnostico" || normalized.startsWith("/diagnostico/")) {
    return "diagnostico";
  }
  if (normalized === "/logs" || normalized.startsWith("/logs/")) return "logs";
  if (normalized === "/backends" || normalized.startsWith("/backends/")) {
    return "backends";
  }
  if (normalized === "/docs/admin/nueva") return "docsNewApi";
  if (normalized === "/docs/admin/clientes") return "docsClients";
  if (normalized === "/docs/admin") return "docsAdmin";
  if (normalized === "/docs") return "internalDocs";
  if (normalized.startsWith("/docs/")) return "internalDocsViewer";
  if (normalized === "/configuracion") return "configuracion";
  if (normalized === "/bienvenida" || normalized.startsWith("/bienvenida/")) {
    return "welcomeLanding";
  }
  if (normalized === "/admin" || normalized.startsWith("/admin/")) return "admin";
  if (normalized === "/privacidad") return "privacy";
  if (normalized === "/terminos") return "terms";
  if (normalized === "/contacto") return "contact";
  if (normalized === "/gracias") return "thankYou";
  if (normalized === "/cliente/login") return "clienteLogin";
  if (normalized === "/cliente" || normalized.startsWith("/cliente/")) {
    return "clienteDocs";
  }

  return null;
};

/** Retorna el componente resuelto en caché síncrona para evitar el fallback de Suspense al transicionar. */
export const getLoadedRouteComponent = <P extends object>(
  key: RouteLoaderKey,
): ComponentType<P> | null =>
  (resolvedComponents.get(key) as ComponentType<P> | undefined) ?? null;

/** Indica si el chunk de la ruta destino ya fue cargado (o no requiere carga lazy). */
export const isRouteChunkLoaded = (pathname: string): boolean => {
  const key = resolveRouteLoaderKey(pathname);
  if (!key) return true;
  return loadedRouteKeys.has(key);
};

/** Inicia la precarga en segundo plano del chunk correspondiente a la ruta destino. */
export const preloadRouteChunk = async (
  to: To,
  currentPathname = "/",
): Promise<void> => {
  const pathname = extractPathnameFromTo(to, currentPathname);
  const key = resolveRouteLoaderKey(pathname);
  if (!key || loadedRouteKeys.has(key)) return;

  try {
    await ROUTE_LOADERS[key]();
  } catch {
    // La navegación real manejará cualquier error de red mediante ErrorBoundary.
  }
};

/**
 * Precarga el chunk de destino con un tope de espera para evitar bloquear la transición en redes lentas.
 */
export const preloadRouteWithTimeout = async (
  to: To,
  currentPathname = "/",
  timeoutMs = 150,
): Promise<void> => {
  const pathname = extractPathnameFromTo(to, currentPathname);
  if (isRouteChunkLoaded(pathname)) return;

  await Promise.race([
    preloadRouteChunk(to, currentPathname),
    new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, timeoutMs);
    }),
  ]);
};
