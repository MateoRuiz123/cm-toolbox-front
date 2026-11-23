import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Route, Routes, useLocation } from "react-router";
import {
  BlockInternalOnClienteDoor,
  RedirectClienteAwayFromHub,
} from "../features/docs-cliente/auth/cliente-door-guards";
import { esAuthBypassActivo } from "../shared/auth/auth-bypass";
import { AccessProvider, useAccess } from "../shared/auth/access-context";
import { AppAccessGuard } from "../shared/auth/app-access-guard";
import { DynamicAppRoutePage } from "../shared/auth/dynamic-app-route-page";
import { AuthProvider } from "../shared/auth/auth-context";
import { AuthGate } from "../shared/auth/auth-gate";
import {
  getLoadedRouteComponent,
  ROUTE_LOADERS,
  type RouteLoaderKey,
} from "../shared/lib/route-preload";
import { usePageTitle } from "../shared/lib/use-page-title";
import { AppFooter } from "../shared/ui/app-footer";
import { AppHeader } from "../shared/ui/app-header";
import { CookieBanner } from "../shared/ui/cookie-banner";
import { ErrorBoundary } from "../shared/ui/error-boundary";
import { RouteSkeletonFallback } from "../shared/ui/route-skeleton-fallback";

/** Títulos de documento en la puerta /cliente (fuera del AppShell). */
const ClientePageTitle = () => {
  usePageTitle();
  return null;
};

/**
 * Envuelve un componente `lazy(ROUTE_LOADERS.x)` para renderizarlo síncronamente
 * cuando su chunk ya fue precargado, evitando el flash del fallback de Suspense en View Transitions.
 */
const withPreloadedRoute = <P extends object>(
  key: RouteLoaderKey,
  LazyComponent: ComponentType<P>,
): ComponentType<P> => {
  const PreloadableRoute = (props: P) => {
    const [{ component: SyncComponent }] = useState(() => ({
      component: getLoadedRouteComponent<P>(key),
    }));
    return SyncComponent ? (
      <SyncComponent {...props} />
    ) : (
      <LazyComponent {...props} />
    );
  };
  return PreloadableRoute;
};

/** Restaura el scroll superior y mueve el foco accesible al contenido principal al cambiar de ruta. */
const RouteFocusScrollManager = () => {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = pathname;

    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }

    document.getElementById("contenido-principal")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
};

const CorporateKeycloakProvider = lazy(ROUTE_LOADERS.corporateKeycloakProvider);
const HubPage = withPreloadedRoute("hub", lazy(ROUTE_LOADERS.hub));
const NotFoundPage = withPreloadedRoute(
  "notFound",
  lazy(ROUTE_LOADERS.notFound),
);
const DiagnosticoPage = withPreloadedRoute(
  "diagnostico",
  lazy(ROUTE_LOADERS.diagnostico),
);
const LogsPage = withPreloadedRoute("logs", lazy(ROUTE_LOADERS.logs));
const BackendsPage = withPreloadedRoute(
  "backends",
  lazy(ROUTE_LOADERS.backends),
);
const AdminPage = withPreloadedRoute("admin", lazy(ROUTE_LOADERS.admin));
const ContactPage = withPreloadedRoute("contact", lazy(ROUTE_LOADERS.contact));
const ThankYouPage = withPreloadedRoute(
  "thankYou",
  lazy(ROUTE_LOADERS.thankYou),
);
const PrivacyPage = withPreloadedRoute("privacy", lazy(ROUTE_LOADERS.privacy));
const TermsPage = withPreloadedRoute("terms", lazy(ROUTE_LOADERS.terms));
const ConfiguracionPage = withPreloadedRoute(
  "configuracion",
  lazy(ROUTE_LOADERS.configuracion),
);
const WelcomeLandingPage = withPreloadedRoute(
  "welcomeLanding",
  lazy(ROUTE_LOADERS.welcomeLanding),
);
const InternalDocsPage = withPreloadedRoute(
  "internalDocs",
  lazy(ROUTE_LOADERS.internalDocs),
);
const InternalDocsViewerPage = withPreloadedRoute(
  "internalDocsViewer",
  lazy(ROUTE_LOADERS.internalDocsViewer),
);
const DocsAdminPage = withPreloadedRoute(
  "docsAdmin",
  lazy(ROUTE_LOADERS.docsAdmin),
);
const DocsNewApiPage = withPreloadedRoute(
  "docsNewApi",
  lazy(ROUTE_LOADERS.docsNewApi),
);
const DocsClientsPage = withPreloadedRoute(
  "docsClients",
  lazy(ROUTE_LOADERS.docsClients),
);
const ClienteLoginPage = withPreloadedRoute(
  "clienteLogin",
  lazy(ROUTE_LOADERS.clienteLogin),
);
const ClienteDocsRoutes = withPreloadedRoute(
  "clienteDocs",
  lazy(ROUTE_LOADERS.clienteDocs),
);

/** Indicador de carga para páginas de feature resueltas con import dinámico. */
const RouteFallback = () => <RouteSkeletonFallback />;

const STATIC_TOOL_IDS = new Set(["diagnostico", "logs", "backends", "docs"]);

export const AppRoutes = () => {
  usePageTitle();
  const { apps } = useAccess();
  const dynamicInternalApps = apps.filter(
    (app) =>
      !STATIC_TOOL_IDS.has(app.id) &&
      app.status !== "hidden" &&
      app.route.startsWith("/"),
  );

  return (
    <Routes>
      <Route path="/" element={<HubPage />} />
      <Route path="/hub" element={<HubPage />} />
      <Route
        path="/diagnostico/*"
        element={
          <AppAccessGuard appId="diagnostico">
            <DiagnosticoPage />
          </AppAccessGuard>
        }
      />
      <Route
        path="/logs"
        element={
          <AppAccessGuard appId="logs">
            <LogsPage />
          </AppAccessGuard>
        }
      />
      <Route
        path="/backends"
        element={
          <AppAccessGuard appId="backends">
            <BackendsPage />
          </AppAccessGuard>
        }
      />
      <Route
        path="/docs"
        element={
          <AppAccessGuard appId="docs">
            <InternalDocsPage />
          </AppAccessGuard>
        }
      />
      <Route
        path="/docs/admin"
        element={
          <AppAccessGuard appId="docs">
            <DocsAdminPage />
          </AppAccessGuard>
        }
      />
      <Route
        path="/docs/admin/nueva"
        element={
          <AppAccessGuard appId="docs">
            <DocsNewApiPage />
          </AppAccessGuard>
        }
      />
      <Route
        path="/docs/admin/clientes"
        element={
          <AppAccessGuard appId="docs">
            <DocsClientsPage />
          </AppAccessGuard>
        }
      />
      <Route
        path="/docs/:apiId"
        element={
          <AppAccessGuard appId="docs">
            <InternalDocsViewerPage />
          </AppAccessGuard>
        }
      />
      <Route path="/configuracion" element={<ConfiguracionPage />} />
      <Route
        path="/bienvenida"
        element={<WelcomeLandingPage standalone />}
      />
      {dynamicInternalApps.map((app) => (
        <Route
          key={app.id}
          path={`${app.route.replace(/\/$/, "")}/*`}
          element={<DynamicAppRoutePage app={app} />}
        />
      ))}
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/contacto" element={<ContactPage />} />
      <Route path="/gracias" element={<ThankYouPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const AppShell = () => {
  const { pathname } = useLocation();
  const isFullHeightTool =
    pathname.startsWith("/logs") || pathname.startsWith("/bienvenida");
  const isWelcomeRoute = pathname.startsWith("/bienvenida");

  return (
    <AuthProvider>
      <AccessProvider>
        <AuthGate>
          <div
            className={`flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)] ${
              isFullHeightTool ? "lg:h-dvh lg:min-h-0 lg:overflow-hidden" : ""
            }`}
          >
            <RouteFocusScrollManager />
            <a
              href="#contenido-principal"
              className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:m-0 focus:inline-flex focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-[var(--radius-1)] focus:bg-[var(--color-action)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-action-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] focus:[clip:auto]"
            >
              Saltar al contenido
            </a>
            {!isWelcomeRoute && <AppHeader />}
            <main
              id="contenido-principal"
              tabIndex={-1}
              className={`${
                isWelcomeRoute ? "" : "vt-app-main "
              }${
                isFullHeightTool
                  ? "flex-1 lg:min-h-0 lg:overflow-hidden"
                  : "flex-1"
              } focus:outline-none`}
            >
              <ErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <AppRoutes />
                </Suspense>
              </ErrorBoundary>
            </main>
            {!isFullHeightTool && <AppFooter />}
            <CookieBanner />
          </div>
        </AuthGate>
      </AccessProvider>
    </AuthProvider>
  );
};

const ClienteArea = () => (
  <BlockInternalOnClienteDoor>
    <ClientePageTitle />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/cliente/login" element={<ClienteLoginPage />} />
        <Route path="/cliente/*" element={<ClienteDocsRoutes />} />
      </Routes>
    </Suspense>
  </BlockInternalOnClienteDoor>
);

/** Punto de composición de la aplicación bajo el SIGO Droop Design System y Auth corporativa. */
export const App = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/cliente")) {
    return (
      <ErrorBoundary>
        <ClienteArea />
      </ErrorBoundary>
    );
  }

  return (
    <RedirectClienteAwayFromHub>
      {esAuthBypassActivo() ? (
        <AppShell />
      ) : (
        <Suspense fallback={<RouteFallback />}>
          <CorporateKeycloakProvider>
            <AppShell />
          </CorporateKeycloakProvider>
        </Suspense>
      )}
    </RedirectClienteAwayFromHub>
  );
};
