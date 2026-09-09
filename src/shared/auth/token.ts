import { safeSessionStorage, safeStorage } from '../lib/safe-storage'

const TOKEN_KEY = 'token_sigoo'
const SESION_KEY = 'sesion_keycloak'

export interface TokensSesion {
  token: string
  refreshToken: string
  idToken?: string
}

/**
 * Guarda el token corporativo en almacenamiento seguro sin exponerlo en la UI.
 */
export const guardarToken = (token?: string | null): void => {
  if (token?.trim()) {
    safeStorage.setItem(TOKEN_KEY, token.trim())
  }
}

/**
 * Obtiene el token guardado para clientes HTTP futuros.
 */
export const obtenerToken = (): string | null => safeStorage.getItem(TOKEN_KEY)

/**
 * Persiste los tokens de la sesión en la pestaña actual para reanudarla tras
 * una recarga sin depender de cookies de terceros.
 */
export const guardarSesionTokens = (tokens: Partial<TokensSesion>): void => {
  if (!tokens.token?.trim() || !tokens.refreshToken?.trim()) {
    return
  }
  safeSessionStorage.setItem(SESION_KEY, JSON.stringify(tokens))
}

/**
 * Recupera los tokens de la pestaña actual, si la sesión sigue vigente.
 */
export const obtenerSesionTokens = (): TokensSesion | null => {
  const crudo = safeSessionStorage.getItem(SESION_KEY)
  if (!crudo) {
    return null
  }

  try {
    const datos = JSON.parse(crudo) as Partial<TokensSesion>
    if (!datos.token || !datos.refreshToken) {
      return null
    }
    return {
      token: datos.token,
      refreshToken: datos.refreshToken,
      idToken: datos.idToken,
    }
  } catch {
    return null
  }
}

/**
 * Limpia los tokens almacenados al cerrar sesión o cuando dejan de ser válidos.
 */
export const limpiarToken = (): void => {
  safeStorage.removeItem(TOKEN_KEY)
  safeSessionStorage.removeItem(SESION_KEY)
}
