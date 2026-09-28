import {
  getLoginKeycloak,
  setKeycloakInstance,
  type Env,
} from '@itcoordinadora/cm-sigoo-temp-ui'
import Keycloak from 'keycloak-js'
import { env } from '../lib/env'

const crearKeycloakClient = (): Keycloak => {
  const envKeycloak = (env.keycloakEnv || 'dev') as Env
  if (env.keycloakUrl && env.keycloakClientId && env.keycloakRealm) {
    const kc = new Keycloak({
      url: env.keycloakUrl,
      realm: env.keycloakRealm,
      clientId: env.keycloakClientId,
    })
    setKeycloakInstance(
      kc as unknown as Parameters<typeof setKeycloakInstance>[0],
      envKeycloak,
    )
    return kc
  }
  return getLoginKeycloak(envKeycloak) as unknown as Keycloak
}

export const keycloakClient: Keycloak = crearKeycloakClient()
