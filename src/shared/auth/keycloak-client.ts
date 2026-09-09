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
    setKeycloakInstance(kc, envKeycloak)
    return kc
  }
  return getLoginKeycloak(envKeycloak)
}

export const keycloakClient: Keycloak = crearKeycloakClient()
