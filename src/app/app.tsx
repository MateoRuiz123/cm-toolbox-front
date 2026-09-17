import { lazy, Suspense } from 'react'
import { KeycloakProvider } from '@itcoordinadora/cm-sigoo-temp-ui'
import { HubPage } from '../features/hub/hub-page'
import { NotFoundPage } from '../features/not-found/not-found-page'
import { esAuthBypassActivo } from '../shared/auth/auth-bypass'
import { AuthProvider } from '../shared/auth/auth-context'
import { AuthGate } from '../shared/auth/auth-gate'
import { keycloakClient } from '../shared/auth/keycloak-client'
import { usePageTitle } from '../shared/lib/use-page-title'
import { RouterProvider } from '../shared/router/router-context'
import { useRouter } from '../shared/router/use-router'
import { AppFooter } from '../shared/ui/app-footer'
import { AppHeader } from '../shared/ui/app-header'
import { CookieBanner } from '../shared/ui/cookie-banner'
import { ErrorBoundary } from '../shared/ui/error-boundary'

const DiagnosticoPage = lazy(() =>
  import('../features/diagnostico/diagnostico-page').then((m) => ({ default: m.DiagnosticoPage })),
)

const ContactPage = lazy(() =>
  import('../features/contact/contact-page').then((m) => ({ default: m.ContactPage })),
)

const ThankYouPage = lazy(() =>
  import('../features/feedback/thank-you-page').then((m) => ({ default: m.ThankYouPage })),
)

const PrivacyPage = lazy(() =>
  import('../features/legal/privacy-page').then((m) => ({ default: m.PrivacyPage })),
)

const TermsPage = lazy(() =>
  import('../features/legal/terms-page').then((m) => ({ default: m.TermsPage })),
)

/** Indicador de carga para páginas de feature resueltas con import dinámico. */
const RouteFallback = () => (
  <div
    className="flex min-h-[40vh] items-center justify-center bg-[var(--surface-app)] text-sm text-[var(--text-muted)]"
    aria-busy="true"
    aria-live="polite"
  >
    Cargando…
  </div>
)

const AppRoutes = () => {
  const { path } = useRouter()
  usePageTitle()

  if (path === '/' || path === '/hub') {
    return <HubPage />
  }

  if (path.startsWith('/diagnostico')) {
    return <DiagnosticoPage />
  }

  if (path.startsWith('/privacidad')) {
    return <PrivacyPage />
  }

  if (path.startsWith('/terminos')) {
    return <TermsPage />
  }

  if (path.startsWith('/contacto')) {
    return <ContactPage />
  }

  if (path.startsWith('/gracias')) {
    return <ThankYouPage />
  }

  return <NotFoundPage />
}

const AppShell = () => (
  <AuthProvider>
    <RouterProvider>
      <AuthGate>
        <div className="flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)]">
          <AppHeader />
          <main className="flex-1">
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <AppRoutes />
              </Suspense>
            </ErrorBoundary>
          </main>
          <AppFooter />
          <CookieBanner />
        </div>
      </AuthGate>
    </RouterProvider>
  </AuthProvider>
)

/** Punto de composición de la aplicación bajo el SIGO Droop Design System y Auth corporativa. */
export const App = () =>
  esAuthBypassActivo() ? (
    <AppShell />
  ) : (
    <KeycloakProvider keycloak={keycloakClient}>
      <AppShell />
    </KeycloakProvider>
  )
