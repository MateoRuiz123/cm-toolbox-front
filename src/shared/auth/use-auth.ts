import { useContext } from 'react'
import { AuthContext } from './auth-context-base'
import type { SesionCorporativa } from './types'

export const useAuth = (): SesionCorporativa => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
