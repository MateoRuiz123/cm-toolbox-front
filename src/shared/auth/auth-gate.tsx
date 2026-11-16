import type { ReactNode } from 'react'
import { useAuth } from './use-auth'
import { useAccess } from './access-context'
import { LoginScreen } from '../../features/auth/login-screen'
import { SinAccesoScreen } from '../../features/auth/sin-acceso-screen'
import { ErrorAuthScreen } from '../../features/auth/error-auth-screen'
import { AppBootScreen } from '../ui/app-boot-screen'

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { estadoAuth, email, errorAuth, cerrarSesion, iniciarSesion, reintentar } = useAuth()
  const { isUserBlocked, refreshAccess } = useAccess()

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

  return <>{children}</>
}
