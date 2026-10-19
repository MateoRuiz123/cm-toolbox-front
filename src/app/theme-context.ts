import { createContext, useContext } from 'react'
import type { ModoDescanso, SistemaVisual } from '../shared/lib/ui-preferences'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  sistema: SistemaVisual
  setSistema: (sistema: SistemaVisual) => void
  descanso: ModoDescanso
  setDescanso: (descanso: ModoDescanso) => void
  toggleDescanso: () => void
  movimientoReducido: boolean
  setMovimientoReducido: (reducido: boolean) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Retorna el tema actual y su acción de alternancia. */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return context
}
