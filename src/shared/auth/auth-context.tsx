import type { ReactNode } from 'react'
import { esAuthBypassActivo } from './auth-bypass'
import { AuthContext } from './auth-context-base'
import { useDevAuth } from './use-dev-auth'
import { useKeycloakAuth } from './use-keycloak-auth'

const DevAuthProvider = ({ children }: { children: ReactNode }) => {
  const sesion = useDevAuth()
  return <AuthContext.Provider value={sesion}>{children}</AuthContext.Provider>
}

const KeycloakAuthProvider = ({ children }: { children: ReactNode }) => {
  const sesion = useKeycloakAuth()
  return <AuthContext.Provider value={sesion}>{children}</AuthContext.Provider>
}

/** Elige sesión mock en pnpm dev o Keycloak en build/deploy y al forzar el IdP. */
export const AuthProvider = ({ children }: { children: ReactNode }) =>
  esAuthBypassActivo() ? (
    <DevAuthProvider>{children}</DevAuthProvider>
  ) : (
    <KeycloakAuthProvider>{children}</KeycloakAuthProvider>
  )
