import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './use-auth'
import { useAccess } from './access-context'
import { LoginScreen } from '../../features/auth/login-screen'
import { SinAccesoScreen } from '../../features/auth/sin-acceso-screen'
import { ErrorAuthScreen } from '../../features/auth/error-auth-screen'
import { AppBootScreen } from '../ui/app-boot-screen'

const WELCOME_SESSION_KEY = 'cm-toolbox:welcome-session-dismissed'

const WelcomeLandingPage = lazy(() =>
  import('../../features/welcome/welcome-landing-page').then((m) => ({
    default: m.WelcomeLandingPage,
  })),
)

const readSessionDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(WELCOME_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { estadoAuth, email, errorAuth, cerrarSesion, iniciarSesion, reintentar } = useAuth()
  const { isUserBlocked, refreshAccess, showWelcomeLanding = true, loadingAccess } = useAccess()
  const [welcomeDismissedInSession, setWelcomeDismissedInSession] = useState(readSessionDismissed)

  useEffect(() => {
    if (estadoAuth !== 'autenticado') {
      setWelcomeDismissedInSession(readSessionDismissed())
    }
  }, [estadoAuth])

  const handleContinueFromWelcome = () => {
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, 'true')
    } catch {
      // Ignorar restricciones de sessionStorage
    }
    setWelcomeDismissedInSession(true)
  }

  if (estadoAuth === 'inicializando') {
    return <AppBootScreen />
  }

  if (estadoAuth === 'error' && errorAuth) {
    return (
      <ErrorAuthScreen
        error={errorAuth}
        onReintentar={reintentar}
        onVolverAlLogin={cerrarSesion}
      />
    )
  }

  if (estadoAuth === 'sin_sesion') {
    return <LoginScreen onLogin={iniciarSesion} />
  }

  if (estadoAuth === 'sin_acceso' || isUserBlocked) {
    return (
      <SinAccesoScreen
        email={email}
        onCerrarSesion={cerrarSesion}
        onReintentar={isUserBlocked ? () => void refreshAccess() : reintentar}
      />
    )
  }

  if (loadingAccess && !welcomeDismissedInSession) {
    return <AppBootScreen />
  }

  if (showWelcomeLanding && !welcomeDismissedInSession) {
    return (
      <Suspense fallback={<AppBootScreen />}>
        <WelcomeLandingPage onContinue={handleContinueFromWelcome} />
      </Suspense>
    )
  }

  return <>{children}</>
}
