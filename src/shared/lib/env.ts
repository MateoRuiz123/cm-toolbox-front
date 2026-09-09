/**
 * Validación y configuración de variables de entorno para el front.
 */
const DEFAULT_PUBSUB_SUBSCRIPTION =
  "projects/cm-api-guias-test/subscriptions/fletes-plenos-sub";

interface EnvConfig {
  readonly diagnosticoUrl: string;
  readonly migrarGuiaUrl: string;
  readonly pubsubSubscription: string;
  readonly keycloakEnv: "dev" | "test" | "prod";
  readonly keycloakUrl: string;
  readonly keycloakRealm: string;
  readonly keycloakClientId: string;
}

const resolveMigrarGuiaUrl = (
  explicitUrl?: string,
  diagnosticoUrl?: string,
): string => {
  if (explicitUrl?.trim()) {
    return explicitUrl.trim();
  }
  if (diagnosticoUrl?.trim()) {
    return diagnosticoUrl.trim().replace(/\/diagnostico\/?$/, "/guia");
  }
  return "";
};

export const getEnv = (): EnvConfig => ({
  diagnosticoUrl: (import.meta.env.VITE_DIAGNOSTICO_URL ?? "").trim(),
  migrarGuiaUrl: resolveMigrarGuiaUrl(
    import.meta.env.VITE_MIGRAR_GUIA_URL,
    import.meta.env.VITE_DIAGNOSTICO_URL,
  ),
  pubsubSubscription:
    (import.meta.env.VITE_PUBSUB_SUBSCRIPTION ?? "").trim() ||
    DEFAULT_PUBSUB_SUBSCRIPTION,
  keycloakEnv:
    ((import.meta.env.VITE_KEYCLOAK_ENV ?? "").trim() as
      | "dev"
      | "test"
      | "prod") || "dev",
  keycloakUrl: (import.meta.env.VITE_KEYCLOAK_URL ?? "").trim(),
  keycloakRealm: (import.meta.env.VITE_KEYCLOAK_REALM ?? "").trim(),
  keycloakClientId: (import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "").trim(),
});

export const env: EnvConfig = {
  get diagnosticoUrl() {
    return getEnv().diagnosticoUrl;
  },
  get migrarGuiaUrl() {
    return getEnv().migrarGuiaUrl;
  },
  get pubsubSubscription() {
    return getEnv().pubsubSubscription;
  },
  get keycloakEnv() {
    return getEnv().keycloakEnv;
  },
  get keycloakUrl() {
    return getEnv().keycloakUrl;
  },
  get keycloakRealm() {
    return getEnv().keycloakRealm;
  },
  get keycloakClientId() {
    return getEnv().keycloakClientId;
  },
};
