/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DIAGNOSTICO_URL: string;
  readonly VITE_MIGRAR_GUIA_URL?: string;
  readonly VITE_PUBSUB_SUBSCRIPTION?: string;
  readonly VITE_KEYCLOAK_ENV?: "dev" | "test" | "prod";
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  readonly VITE_AUTH_FORCE_KEYCLOAK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
