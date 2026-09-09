import { KeycloakProvider } from '@itcoordinadora/cm-sigoo-temp-ui'
import { DiagnosticoPage } from '../features/diagnostico/diagnostico-page'
import { HubPage } from '../features/hub/hub-page'
import { AppHeader } from '../shared/ui/app-header'
import { ErrorBoundary } from '../shared/ui/error-boundary'
import { AuthProvider } from '../shared/auth/auth-context'
import { AuthGate } from '../shared/auth/auth-gate'
import { keycloakClient } from '../shared/auth/keycloak-client'
import { RouterProvider } from '../shared/router/router-context'
import { useRouter } from '../shared/router/use-router'

const AppRoutes = () => {
  const { path } = useRouter()

  if (path.startsWith('/diagnostico')) {
    return <DiagnosticoPage />
  }

  return <HubPage />
}

/** Punto de composición de la aplicación bajo el SIGO Droop Design System y Auth corporativa. */
export const App = () => (
  <KeycloakProvider keycloak={keycloakClient}>
    <AuthProvider>
      <RouterProvider>
        <AuthGate>
          <div className="min-h-screen bg-[var(--surface-app)] text-[var(--text-body)]">
            <AppHeader />
            <main>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </main>
          </div>
        </AuthGate>
      </RouterProvider>
    </AuthProvider>
  </KeycloakProvider>
)
