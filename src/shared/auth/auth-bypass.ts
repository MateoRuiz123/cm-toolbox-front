export interface AuthBypassEnv {
  readonly DEV: boolean;
  readonly VITE_AUTH_FORCE_KEYCLOAK?: string;
}

const envActual = (): AuthBypassEnv => ({
  DEV: import.meta.env.DEV,
  VITE_AUTH_FORCE_KEYCLOAK: import.meta.env.VITE_AUTH_FORCE_KEYCLOAK,
});

/**
 * El bypass solo vive en `pnpm dev`. En `pnpm build` Vite deja DEV=false
 * y esta rama no se activa, aunque exista VITE_AUTH_FORCE_KEYCLOAK.
 */
export const esAuthBypassActivo = (env: AuthBypassEnv = envActual()): boolean =>
  Boolean(env.DEV) && env.VITE_AUTH_FORCE_KEYCLOAK !== "true";
