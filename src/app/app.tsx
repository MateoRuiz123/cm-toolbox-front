import { KeycloakProvider } from '@itcoordinadora/cm-sigoo-temp-ui'
import { ContactPage } from '../features/contact/contact-page'
import { DiagnosticoPage } from '../features/diagnostico/diagnostico-page'
import { ThankYouPage } from '../features/feedback/thank-you-page'
import { HubPage } from '../features/hub/hub-page'
import { PrivacyPage } from '../features/legal/privacy-page'
import { TermsPage } from '../features/legal/terms-page'
import { NotFoundPage } from '../features/not-found/not-found-page'
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

/** Punto de composición de la aplicación bajo el SIGO Droop Design System y Auth corporativa. */
export const App = () => (
  <KeycloakProvider keycloak={keycloakClient}>
    <AuthProvider>
      <RouterProvider>
        <AuthGate>
          <div className="flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)]">
            <AppHeader />
            <main className="flex-1">
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </main>
            <AppFooter />
            <CookieBanner />
          </div>
        </AuthGate>
      </RouterProvider>
    </AuthProvider>
  </KeycloakProvider>
)
