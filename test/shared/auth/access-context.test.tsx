import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AccessProvider,
  useAccess,
} from "../../../src/shared/auth/access-context";
import { AuthContext } from "../../../src/shared/auth/auth-context-base";
import type { SesionCorporativa } from "../../../src/shared/auth/types";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";

const authStub = (
  overrides: Partial<SesionCorporativa> = {},
): SesionCorporativa => ({
  estadoAuth: "autenticado",
  email: "user@coordinadora.com",
  terminal: "toolbox",
  errorAuth: null,
  cerrarSesion: () => undefined,
  iniciarSesion: async () => undefined,
  reintentar: () => undefined,
  ...overrides,
});

const LoadingProbe = () => {
  const { loadingAccess, profile } = useAccess();
  return (
    <div>
      <span data-testid="loading">{String(loadingAccess)}</span>
      <span data-testid="email">{profile.email}</span>
    </div>
  );
};

describe("AccessProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pone loadingAccess en true hasta resolver el perfil remoto", async () => {
    let resolveAccess!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveAccess = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending);

    render(
      <AuthContext.Provider value={authStub()}>
        <AccessProvider>
          <LoadingProbe />
        </AccessProvider>
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");

    resolveAccess(
      new Response(
        JSON.stringify({
          data: {
            ...buildFallbackAccessProfile("user@coordinadora.com"),
            isSuperAdmin: false,
            roleId: "user",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("email").textContent).toBe(
      "user@coordinadora.com",
    );
  });
});
