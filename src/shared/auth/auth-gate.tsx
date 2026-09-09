import type { ReactNode } from 'react'
import { useAuth } from './use-auth'
import { LoginScreen } from '../../features/auth/login-screen'
import { SinAccesoScreen } from '../../features/auth/sin-acceso-screen'
import { ErrorAuthScreen } from '../../features/auth/error-auth-screen'

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { estadoAuth, email, errorAuth, cerrarSesion, iniciarSesion, reintentar } = useAuth()

  if (estadoAuth === 'inicializando') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--surface-app)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-10 animate-spin rounded-full border-3 border-[var(--color-primary-soft)] border-t-[var(--color-primary)]" />
          <p className="text-sm font-medium text-[var(--text-muted)] animate-pulse">
            Verificando credenciales corporativas...
          </p>
        </div>
      </div>
    )
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

  if (estadoAuth === 'sin_acceso') {
    return (
      <SinAccesoScreen
        email={email}
        onCerrarSesion={cerrarSesion}
        onReintentar={reintentar}
      />
    )
  }

  return <>{children}</>
}
