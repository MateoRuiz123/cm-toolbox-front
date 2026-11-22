import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { startVolumetricWord } from "../../../src/features/welcome/volumetric-word-renderer";
import { WelcomeLandingPage } from "../../../src/features/welcome/welcome-landing-page";
import { AccessContext } from "../../../src/shared/auth/access-context";
import { createContextValueFromProfile } from "../../../src/shared/auth/access-context-base";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";
import { usePageTitle } from "../../../src/shared/lib/use-page-title";

const WelcomeRouteWithTitle = ({ onContinue }: { onContinue: () => void }) => {
  usePageTitle();
  return <WelcomeLandingPage onContinue={onContinue} />;
};

const createFakeWebGL2 = () => {
  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    REPEAT: 0x2901,
    CLAMP_TO_EDGE: 0x812f,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    TEXTURE0: 0x84c0,
    TEXTURE1: 0x84c1,
    TRIANGLES: 0x0004,
    createShader: () => ({}),
    shaderSource: () => undefined,
    compileShader: () => undefined,
    getShaderParameter: () => true,
    deleteShader: () => undefined,
    createProgram: () => ({}),
    attachShader: () => undefined,
    linkProgram: () => undefined,
    getProgramParameter: () => true,
    deleteProgram: () => undefined,
    createVertexArray: () => ({}),
    bindVertexArray: () => undefined,
    deleteVertexArray: () => undefined,
    createTexture: () => ({}),
    bindTexture: () => undefined,
    deleteTexture: () => undefined,
    texParameteri: () => undefined,
    texImage2D: () => undefined,
    pixelStorei: () => undefined,
    getUniformLocation: () => ({}),
    viewport: () => undefined,
    useProgram: () => undefined,
    activeTexture: () => undefined,
    uniform1i: () => undefined,
    uniform1f: () => undefined,
    uniform2f: () => undefined,
    uniform3f: () => undefined,
    drawArrays: vi.fn(),
  };
  return gl;
};

describe("WelcomeLandingPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });

  it("en sesión local de desarrollo muestra solo 'Hola' sin el texto del rol ni placeholders", async () => {
    const user = userEvent.setup();
    const updatePref = vi.fn(async () => undefined);
    const onContinue = vi.fn();
    const devProfile = {
      ...buildFallbackAccessProfile(),
      displayName: "Desarrollador Local (Super Admin)",
    };

    render(
      <AccessContext.Provider
        value={createContextValueFromProfile(devProfile, {
          showWelcomeLanding: true,
          updateWelcomeLandingPreference: updatePref,
        })}
      >
        <ThemeProvider>
          <MemoryRouter initialEntries={["/bienvenida"]}>
            <Routes>
              <Route
                path="/bienvenida"
                element={<WelcomeRouteWithTitle onContinue={onContinue} />}
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(document.title).toBe("Bienvenida | Coordinadora Toolbox");
    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(screen.queryByText(/super admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/desarrollador local/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Tus herramientas de soporte y diagnóstico, en un solo lugar.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /coordinadora/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("COORDINADORA")).toBeInTheDocument();

    const yesBtn = screen.getByRole("button", { name: "Sí" });
    const noBtn = screen.getByRole("button", { name: "No" });
    expect(yesBtn).toHaveAttribute("aria-pressed", "true");
    expect(noBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(noBtn);
    expect(updatePref).toHaveBeenCalledWith(false);

    await user.click(
      screen.getByRole("button", { name: /entrar al portal/i }),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("muestra solo el primer nombre sin apellido ni rol entre paréntesis para usuarios reales", () => {
    const profile = {
      ...buildFallbackAccessProfile("valentina.gomez@coordinadora.com"),
      displayName: "Valentina Gómez (Super Admin)",
    };

    render(
      <AccessContext.Provider value={createContextValueFromProfile(profile)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/bienvenida"]}>
            <Routes>
              <Route
                path="/bienvenida"
                element={<WelcomeLandingPage onContinue={() => undefined} />}
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(screen.getByText("Hola, Valentina")).toBeInTheDocument();
    expect(screen.queryByText(/Gómez/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Super Admin/i)).not.toBeInTheDocument();
  });

  it("usa fallback 'Hola' cuando el usuario no tiene displayName", () => {
    const profile = {
      ...buildFallbackAccessProfile("analista@coordinadora.com"),
      displayName: null,
    };

    render(
      <AccessContext.Provider value={createContextValueFromProfile(profile)}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/bienvenida"]}>
            <Routes>
              <Route
                path="/bienvenida"
                element={<WelcomeLandingPage onContinue={() => undefined} />}
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(screen.queryByText(/Super Admin/i)).not.toBeInTheDocument();
  });

  it("con reducedMotion dibuja un solo frame estático sin loop RAF y usa powerPreference default", () => {
    const fakeGl = createFakeWebGL2();
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation((contextId: string) => {
        if (contextId === "webgl2") {
          return fakeGl as unknown as WebGL2RenderingContext;
        }
        return null;
      });
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(9);

    const canvas = document.createElement("canvas");
    const controller = startVolumetricWord(canvas, "COORDINADORA", {
      reducedMotion: true,
    });

    expect(controller.isWebGL2Supported).toBe(true);
    expect(getContextSpy).toHaveBeenCalledWith(
      "webgl2",
      expect.objectContaining({ powerPreference: "default" }),
    );
    expect(fakeGl.drawArrays).toHaveBeenCalledTimes(1);
    expect(rafSpy).not.toHaveBeenCalled();

    controller.cleanup();
  });

  it("pausa el render al cambiar visibilitychange a hidden y cancela RAF pendiente", () => {
    const fakeGl = createFakeWebGL2();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      (contextId: string) =>
        contextId === "webgl2"
          ? (fakeGl as unknown as WebGL2RenderingContext)
          : null,
    );
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
    const cancelSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);

    const canvas = document.createElement("canvas");
    const controller = startVolumetricWord(canvas, "COORDINADORA", {
      reducedMotion: false,
    });

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(cancelSpy).toHaveBeenCalledWith(42);
    controller.cleanup();
  });
});
