import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { ClienteDocsRoutes } from "../../../src/features/docs-cliente/cliente-docs-routes";
import { ClienteLoginPage } from "../../../src/features/docs-cliente/cliente-login-page";
import { obtenerTokenCliente } from "../../../src/features/docs-cliente/auth/cliente-token";

vi.mock("@/shared/auth/auth-bypass", () => ({
  esAuthBypassActivo: vi.fn(() => true),
}));

const createOpenAwareFetch = () => {
  const seenAudiences: Array<string | undefined> = [];
  const openedTokens = new Set<string>();

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = (init?.headers ?? {}) as Record<string, string>;

    if (url === "/docs-api/v1/clients/activation/open" && init?.method === "POST") {
      const parsed = JSON.parse(String(init.body ?? "{}")) as {
        activationToken?: string;
      };
      const tok = parsed.activationToken ?? "";
      if (openedTokens.has(tok)) {
        return new Response(
          JSON.stringify({
            message:
              "Este enlace de activación ya fue utilizado y se encuentra inhabilitado.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      openedTokens.add(tok);
      return new Response(
        JSON.stringify({
          data: { valid: true, claimToken: `claim-${tok}` },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "/docs-api/v1/clients/activate" && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          data: {
            id: "900123456",
            name: "Cliente Empresa X",
            email: "tech@empresax.com",
            status: "active",
            createdAt: "2026-11-17T00:00:00.000Z",
            updatedAt: "2026-11-17T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "/docs-api/v1/me") {
      seenAudiences.push(headers["X-Dev-Audiences"]);
      return new Response(
        JSON.stringify({
          data: {
            id: "900123456",
            name: "Cliente Empresa X",
            email: "tech@empresax.com",
            status: "active",
            createdAt: "2026-11-17T00:00:00.000Z",
            updatedAt: "2026-11-17T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "/docs-api/v1/apis") {
      seenAudiences.push(headers["X-Dev-Audiences"]);
      const isEmpresaX = headers["X-Dev-Audiences"] === "client:900123456";
      return new Response(
        JSON.stringify({
          data: isEmpresaX
            ? [
                {
                  id: "api-guias-empresax",
                  name: "API Guías Empresa X",
                  description: "Contrato exclusivo",
                  version: "1.2.0",
                  updatedAt: "2026-11-17T00:00:00.000Z",
                  audiences: ["client:900123456"],
                },
              ]
            : [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });

  return { fetchMock, seenAudiences };
};

describe("Flujo completo de activación y visualización de docs de cliente", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("valida checks de seguridad, alterna ojo animado, activa cuenta, inhabilita link reabierto y muestra docs del NIT", async () => {
    const user = userEvent.setup();
    const { fetchMock, seenAudiences } = createOpenAwareFetch();
    vi.stubGlobal("fetch", fetchMock);

    const view = render(
      <ThemeProvider>
        <MemoryRouter
          initialEntries={[
            "/cliente/login?client=900123456&activation_token=tok-unique-1",
          ]}
        >
          <Routes>
            <Route path="/cliente/login" element={<ClienteLoginPage />} />
            <Route path="/cliente/*" element={<ClienteDocsRoutes />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText(/Enlace de activación listo para/i),
    ).toBeInTheDocument();

    const passwordInput = screen.getByLabelText(
      "Nueva contraseña",
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const eyeBtn = screen.getByRole("button", {
      name: /mostrar nueva contraseña/i,
    });
    expect(eyeBtn).toHaveAttribute("aria-pressed", "false");
    await user.click(eyeBtn);
    expect(passwordInput.type).toBe("text");
    expect(
      screen.getByRole("button", { name: /ocultar nueva contraseña/i }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.type(passwordInput, "abc");
    expect(screen.getByText("1/5 requisitos")).toBeInTheDocument();

    await user.clear(passwordInput);
    await user.type(passwordInput, "ClaveSegura123!");
    expect(screen.getByText("5/5 requisitos")).toBeInTheDocument();

    const checklist = screen.getByRole("list", {
      name: /requisitos de contraseña/i,
    });
    const listItems = Array.from(checklist.querySelectorAll("li"));
    expect(listItems).toHaveLength(5);
    expect(listItems.every((li) => li.dataset.passed === "true")).toBe(true);

    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "ClaveSegura123!",
    );
    expect(screen.getByText("Las contraseñas coinciden.")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /activar cuenta y entrar/i }),
    );

    expect(
      await screen.findByText("API Guías Empresa X"),
    ).toBeInTheDocument();
    expect(obtenerTokenCliente()).toBe("dev-cliente-token:900123456");
    await waitFor(() => {
      expect(seenAudiences).toContain("client:900123456");
    });

    view.unmount();

    // Reapertura del mismo link: debe quedar inhabilitado inmediatamente
    render(
      <ThemeProvider>
        <MemoryRouter
          initialEntries={[
            "/cliente/login?client=900123456&activation_token=tok-unique-1",
          ]}
        >
          <Routes>
            <Route path="/cliente/login" element={<ClienteLoginPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText(/ya fue utilizado y se encuentra inhabilitado/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Nueva contraseña"),
    ).not.toBeInTheDocument();
  });

  it("muestra error cuando las contraseñas no coinciden en la activación", async () => {
    const user = userEvent.setup();
    const { fetchMock } = createOpenAwareFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ThemeProvider>
        <MemoryRouter
          initialEntries={[
            "/cliente/login?client=900123456&activation_token=tok-mismatch",
          ]}
        >
          <Routes>
            <Route path="/cliente/login" element={<ClienteLoginPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.type(
      await screen.findByLabelText("Nueva contraseña"),
      "ClaveSegura123!",
    );
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "OtraClave999!",
    );
    await user.click(
      screen.getByRole("button", { name: /activar cuenta y entrar/i }),
    );

    expect(
      await screen.findByText(/Las contraseñas no coinciden\./i),
    ).toBeInTheDocument();
  });

  it("bloquea el acceso si el enlace de activación expiró", async () => {
    const pastIso = new Date(Date.now() - 3600_000).toISOString();

    render(
      <ThemeProvider>
        <MemoryRouter
          initialEntries={[
            `/cliente/login?client=900123456&activation_token=tok-exp&expires_at=${encodeURIComponent(pastIso)}`,
          ]}
        >
          <Routes>
            <Route path="/cliente/login" element={<ClienteLoginPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText(/El enlace temporal para/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Nueva contraseña"),
    ).not.toBeInTheDocument();
  });
});
