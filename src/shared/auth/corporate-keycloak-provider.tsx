import type { ReactNode, ComponentProps } from "react";
import { KeycloakProvider } from "@itcoordinadora/cm-sigoo-temp-ui";
import { keycloakClient } from "./keycloak-client";

export const CorporateKeycloakProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  <KeycloakProvider
    keycloak={
      keycloakClient as unknown as ComponentProps<
        typeof KeycloakProvider
      >["keycloak"]
    }
  >
    {children}
  </KeycloakProvider>
);

export default CorporateKeycloakProvider;
