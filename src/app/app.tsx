import { lazy, Suspense } from "react";
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

const CorporateKeycloakProvider = lazy(() =>
  import("../shared/auth/corporate-keycloak-provider").then((m) => ({
    default: m.CorporateKeycloakProvider,
  })),
);

const HubPage = lazy(() =>
  import("../features/hub/hub-page").then((m) => ({
    default: m.HubPage,
  })),
);

const NotFoundPage = lazy(() =>
  import("../features/not-found/not-found-page").then((m) => ({
    default: m.NotFoundPage,
  })),
);

const DiagnosticoPage = lazy(() =>
  import("../features/diagnostico/diagnostico-page").then((m) => ({
    default: m.DiagnosticoPage,
  })),
);

const LogsPage = lazy(() =>
  import("../features/logs/logs-page").then((m) => ({ default: m.LogsPage })),
);

const BackendsPage = lazy(() =>
  import("../features/backends/backends-page").then((m) => ({
    default: m.BackendsPage,
  })),
);

const AdminPage = lazy(() =>
  import("../features/admin/admin-page").then((m) => ({
    default: m.AdminPage,
  })),
);

const ContactPage = lazy(() =>
  import("../features/contact/contact-page").then((m) => ({
    default: m.ContactPage,
  })),
);

const ThankYouPage = lazy(() =>
  import("../features/feedback/thank-you-page").then((m) => ({
    default: m.ThankYouPage,
  })),
);

const PrivacyPage = lazy(() =>
  import("../features/legal/privacy-page").then((m) => ({
    default: m.PrivacyPage,
  })),
);

const TermsPage = lazy(() =>
  import("../features/legal/terms-page").then((m) => ({
    default: m.TermsPage,
  })),
);

const ConfiguracionPage = lazy(() =>
  import("../features/configuracion/configuracion-page").then((m) => ({
    default: m.ConfiguracionPage,
  })),
);

const InternalDocsPage = lazy(() =>
  import("../features/docs/internal-docs-pages").then((m) => ({
    default: m.InternalDocsPage,
  })),
);

const InternalDocsViewerPage = lazy(() =>
  import("../features/docs/internal-docs-pages").then((m) => ({
    default: m.InternalDocsViewerPage,
  })),
);

const DocsAdminPage = lazy(() =>
  import("../features/docs/admin/docs-admin-page").then((m) => ({
    default: m.DocsAdminPage,
  })),
);

const DocsNewApiPage = lazy(() =>
  import("../features/docs/admin/new-api-form").then((m) => ({
    default: m.DocsNewApiPage,
  })),
);

const DocsClientsPage = lazy(() =>
  import("../features/docs/admin/clients-page").then((m) => ({
    default: m.ClientsPage,
  })),
);

const ClienteLoginPage = lazy(() =>
  import("../features/docs-cliente/cliente-login-page").then((m) => ({
    default: m.ClienteLoginPage,
  })),
);

const ClienteDocsRoutes = lazy(() =>
  import("../features/docs-cliente/cliente-docs-routes").then((m) => ({
    default: m.ClienteDocsRoutes,
  })),
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
  const isFullHeightTool = pathname.startsWith("/logs");

  return (
    <AuthProvider>
      <AccessProvider>
        <AuthGate>
          <div
            className={`flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)] ${
              isFullHeightTool ? "lg:h-dvh lg:min-h-0 lg:overflow-hidden" : ""
            }`}
          >
            <a
              href="#contenido-principal"
              className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:m-0 focus:inline-flex focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-[var(--radius-1)] focus:bg-[var(--color-action)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-action-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] focus:[clip:auto]"
            >
              Saltar al contenido
            </a>
            <AppHeader />
            <main
              id="contenido-principal"
              tabIndex={-1}
              className={
                isFullHeightTool
                  ? "flex-1 lg:min-h-0 lg:overflow-hidden"
                  : "flex-1"
              }
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
