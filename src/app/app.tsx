import { lazy, Suspense, type ComponentProps } from 'react'
import { KeycloakProvider } from '@itcoordinadora/cm-sigoo-temp-ui'
import { Route, Routes, useLocation } from 'react-router'
import { HubPage } from '../features/hub/hub-page'
import { NotFoundPage } from '../features/not-found/not-found-page'
import { esAuthBypassActivo } from '../shared/auth/auth-bypass'
import { AuthProvider } from '../shared/auth/auth-context'
import { AuthGate } from '../shared/auth/auth-gate'
import { keycloakClient } from '../shared/auth/keycloak-client'
import { usePageTitle } from '../shared/lib/use-page-title'
import { AppFooter } from '../shared/ui/app-footer'
import { AppHeader } from '../shared/ui/app-header'
import { CookieBanner } from '../shared/ui/cookie-banner'
import { ErrorBoundary } from '../shared/ui/error-boundary'

const DiagnosticoPage = lazy(() =>
  import('../features/diagnostico/diagnostico-page').then((m) => ({ default: m.DiagnosticoPage })),
)

const LogsPage = lazy(() =>
  import('../features/logs/logs-page').then((m) => ({ default: m.LogsPage })),
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

export const AppRoutes = () => {
  usePageTitle()

  return (
    <Routes>
      <Route path="/" element={<HubPage />} />
      <Route path="/hub" element={<HubPage />} />
      <Route path="/diagnostico/*" element={<DiagnosticoPage />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/contacto" element={<ContactPage />} />
      <Route path="/gracias" element={<ThankYouPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

const AppShell = () => {
  const { pathname } = useLocation()
  const isFullHeightTool = pathname.startsWith('/logs')

  return (
    <AuthProvider>
      <AuthGate>
        <div
          className={`flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)] ${
            isFullHeightTool ? 'lg:h-dvh lg:min-h-0 lg:overflow-hidden' : ''
          }`}
        >
          <AppHeader />
          <main className={isFullHeightTool ? 'flex-1 lg:min-h-0 lg:overflow-hidden' : 'flex-1'}>
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
    </AuthProvider>
  )
}

/** Punto de composición de la aplicación bajo el SIGO Droop Design System y Auth corporativa. */
export const App = () =>
  esAuthBypassActivo() ? (
    <AppShell />
  ) : (
    <KeycloakProvider
      keycloak={
        keycloakClient as unknown as ComponentProps<
          typeof KeycloakProvider
        >["keycloak"]
      }
    >
      <AppShell />
    </KeycloakProvider>
  )
