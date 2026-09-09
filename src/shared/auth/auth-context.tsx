import type { ReactNode } from 'react'
import { useKeycloakAuth } from './use-keycloak-auth'
import { AuthContext } from './auth-context-base'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const sesion = useKeycloakAuth()
  return <AuthContext.Provider value={sesion}>{children}</AuthContext.Provider>
}
