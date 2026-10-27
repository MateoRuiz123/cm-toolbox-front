import Keycloak from "keycloak-js";
import { env } from "@/shared/lib/env";

/**
 * Client OIDC distinto al del toolbox interno (sin IdP Google).
 * Si no hay VITE_KEYCLOAK_CLIENT_ID_CLIENTES, reutiliza el clientId base
 * solo para cableado local (prod debe definir el client de clientes).
 */
export const createClienteKeycloak = (): Keycloak => {
  const clientId =
    (
      import.meta.env.VITE_KEYCLOAK_CLIENT_ID_CLIENTES as string | undefined
    )?.trim() ||
    env.keycloakClientId ||
    "toolbox-docs-clientes";

  return new Keycloak({
    url: env.keycloakUrl || "https://cmautenticacion-test.coordinadora.com",
    realm: env.keycloakRealm || "autenticacion_usuarios",
    clientId,
  });
};
