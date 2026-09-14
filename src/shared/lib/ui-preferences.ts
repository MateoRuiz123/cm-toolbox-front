import { safeStorage } from './safe-storage'

export type ModoVista = 'list' | 'grid'
export type ModoTema = 'light' | 'dark'

export const PREFERENCIAS_KEYS = {
  THEME: 'theme',
  VIEW_MODE: 'diagnostico_view_mode',
} as const

export interface PreferenciasUI {
  theme: string | null
  viewMode: string | null
}

/** Obtiene el tema guardado o null si no se ha configurado. */
export const obtenerPreferenciaTema = (): ModoTema | null => {
  const guardado = safeStorage.getItem(PREFERENCIAS_KEYS.THEME)
  if (guardado === 'light' || guardado === 'dark') {
    return guardado
  }
  return null
}

/** Guarda la preferencia de tema (claro u oscuro). */
export const guardarPreferenciaTema = (tema: ModoTema): void => {
  safeStorage.setItem(PREFERENCIAS_KEYS.THEME, tema)
}

/** Obtiene la preferencia de vista (lista o cuadros/cuadrícula). */
export const obtenerPreferenciaVista = (): ModoVista => {
  const guardado = safeStorage.getItem(PREFERENCIAS_KEYS.VIEW_MODE)
  return guardado === 'grid' ? 'grid' : 'list'
}

/** Guarda la preferencia de vista (lista o cuadros). */
export const guardarPreferenciaVista = (vista: ModoVista): void => {
  safeStorage.setItem(PREFERENCIAS_KEYS.VIEW_MODE, vista)
}

/** Extrae snapshot de las preferencias de UI para que sobrevivan a limpiezas de sesión/logout. */
export const obtenerSnapshotPreferencias = (): PreferenciasUI => ({
  theme: safeStorage.getItem(PREFERENCIAS_KEYS.THEME),
  viewMode: safeStorage.getItem(PREFERENCIAS_KEYS.VIEW_MODE),
})

/** Restaura snapshot de preferencias de UI tras un logout o reseteo de almacenamiento. */
export const restaurarSnapshotPreferencias = (prefs: PreferenciasUI): void => {
  if (prefs.theme) safeStorage.setItem(PREFERENCIAS_KEYS.THEME, prefs.theme)
  if (prefs.viewMode) safeStorage.setItem(PREFERENCIAS_KEYS.VIEW_MODE, prefs.viewMode)
}
