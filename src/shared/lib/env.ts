/**
 * Validación y configuración de variables de entorno para el front.
 */
const DEFAULT_PUBSUB_SUBSCRIPTION =
  "projects/cm-api-guias-test/subscriptions/fletes-plenos-sub";

interface EnvConfig {
  readonly diagnosticoUrl: string;
  readonly migrarGuiaUrl: string;
  readonly asignarEquipoDespachoUrl: string;
  readonly pubsubSubscription: string;
  readonly keycloakEnv: "dev" | "test" | "prod";
  readonly keycloakUrl: string;
  readonly keycloakRealm: string;
  readonly keycloakClientId: string;
}

/** Rutas same-origin. nginx (prod) y Vite (dev) las enrutan a DIAGNOSTICO_API_UPSTREAM. */
const DIAGNOSTICO_PATH = "/migracion/diagnostico";
const MIGRAR_GUIA_PATH = "/migracion/guia";
const ASIGNAR_EQUIPO_DESPACHO_PATH = "/migracion/despacho/equipo";

export const getEnv = (): EnvConfig => ({
  diagnosticoUrl: DIAGNOSTICO_PATH,
  migrarGuiaUrl: MIGRAR_GUIA_PATH,
  asignarEquipoDespachoUrl: ASIGNAR_EQUIPO_DESPACHO_PATH,
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
  get asignarEquipoDespachoUrl() {
    return getEnv().asignarEquipoDespachoUrl;
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
