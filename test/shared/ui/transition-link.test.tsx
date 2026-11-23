import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import {
  extractPathnameFromTo,
  isRouteChunkLoaded,
  preloadRouteChunk,
  preloadRouteWithTimeout,
  resolveRouteLoaderKey,
  ROUTE_LOADERS,
} from "../../../src/shared/lib/route-preload";
import { useTransitionNavigate } from "../../../src/shared/lib/use-transition-navigate";
import {
  isSimpleRootTransitionPath,
  runRouteViewTransition,
  supportsViewTransitions,
} from "../../../src/shared/lib/view-transition";
import { TransitionLink } from "../../../src/shared/ui/transition-link";

const setStartViewTransitionMock = (
  fn: (callback: () => void) => { finished: Promise<void> } | void,
) => {
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: fn,
  });
};

const clearStartViewTransitionMock = () => {
  Reflect.deleteProperty(document, "startViewTransition");
};

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const NavHarness = () => {
  const location = useLocation();
  const navigate = useTransitionNavigate();

  return (
    <div>
      <p data-testid="current-location">
        {location.pathname}
        {location.search}
        {location.hash}
      </p>
      <TransitionLink to="/diagnostico">Ir a Diagnóstico</TransitionLink>
      <TransitionLink to="/bienvenida">Ir a Bienvenida</TransitionLink>
      <TransitionLink to="/cliente/docs">Ir a Clientes</TransitionLink>
      <TransitionLink to="/?tab=2">Misma ruta con query</TransitionLink>
      <TransitionLink to="/logs" skipViewTransition>
        Omitir transición
      </TransitionLink>
      <button
        type="button"
        onClick={() => navigate("/configuracion")}
      >
        Navegar programático
      </button>
      <button
        type="button"
        onClick={() => navigate("/?tab=3")}
      >
        Programático misma ruta
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Volver atrás
      </button>
    </div>
  );
};

const renderRouter = (initialEntry = "/") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavHarness />
      <Routes>
        <Route path="/" element={<p>Vista Hub</p>} />
        <Route path="/diagnostico" element={<p>Vista Diagnóstico</p>} />
        <Route path="/logs" element={<p>Vista Logs</p>} />
        <Route path="/configuracion" element={<p>Vista Apariencia</p>} />
        <Route path="/bienvenida" element={<p>Vista Bienvenida</p>} />
        <Route path="/cliente/*" element={<p>Vista Clientes</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("TransitionLink y View Transitions", () => {
  afterEach(() => {
    clearStartViewTransitionMock();
    delete document.documentElement.dataset.vtMode;
    delete document.documentElement.dataset.movimiento;
    vi.restoreAllMocks();
  });

  it("navega sin errores cuando document.startViewTransition no existe (jsdom/Firefox)", async () => {
    const user = userEvent.setup();
    expect(supportsViewTransitions()).toBe(false);

    renderRouter("/");
    await user.click(screen.getByRole("link", { name: "Ir a Diagnóstico" }));

    expect(await screen.findByText("Vista Diagnóstico")).toBeInTheDocument();
    expect(document.documentElement.dataset.vtMode).toBeUndefined();
  });

  it("activa data-vt-mode='route' durante la transición entre rutas normales y lo limpia al finalizar", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    let modeDuringCallback: string | undefined;

    const startViewTransition = vi.fn((callback: () => void) => {
      modeDuringCallback = document.documentElement.dataset.vtMode;
      callback();
      return { finished: deferred.promise };
    });
    setStartViewTransitionMock(startViewTransition);

    await preloadRouteChunk("/diagnostico", "/");
    renderRouter("/");

    await user.click(screen.getByRole("link", { name: "Ir a Diagnóstico" }));

    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(1));
    expect(modeDuringCallback).toBe("route");
    expect(document.documentElement.dataset.vtMode).toBe("route");
    expect(screen.getByText("Vista Diagnóstico")).toBeInTheDocument();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(document.documentElement.dataset.vtMode).toBeUndefined();
  });

  it("usa transición simple en root (sin data-vt-mode='route') hacia /bienvenida y /cliente/*", async () => {
    const user = userEvent.setup();
    const deferredWelcome = createDeferred();
    const deferredClient = createDeferred();

    const startViewTransition = vi
      .fn()
      .mockImplementationOnce((callback: () => void) => {
        expect(document.documentElement.dataset.vtMode).toBeUndefined();
        callback();
        return { finished: deferredWelcome.promise };
      })
      .mockImplementationOnce((callback: () => void) => {
        expect(document.documentElement.dataset.vtMode).toBeUndefined();
        callback();
        return { finished: deferredClient.promise };
      });

    setStartViewTransitionMock(startViewTransition);

    await preloadRouteChunk("/bienvenida", "/");
    await preloadRouteChunk("/cliente/docs", "/");
    renderRouter("/");

    await user.click(screen.getByRole("link", { name: "Ir a Bienvenida" }));
    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Vista Bienvenida")).toBeInTheDocument();
    expect(document.documentElement.dataset.vtMode).toBeUndefined();

    await act(async () => {
      deferredWelcome.resolve();
      await deferredWelcome.promise;
    });

    await user.click(screen.getByRole("link", { name: "Ir a Clientes" }));
    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Vista Clientes")).toBeInTheDocument();
    expect(document.documentElement.dataset.vtMode).toBeUndefined();
  });

  it("respeta data-movimiento='reducido' omitiendo startViewTransition pero completando la navegación", async () => {
    const user = userEvent.setup();
    document.documentElement.dataset.movimiento = "reducido";

    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return { finished: Promise.resolve() };
    });
    setStartViewTransitionMock(startViewTransition);

    renderRouter("/");

    await user.click(screen.getByRole("link", { name: "Ir a Diagnóstico" }));

    expect(await screen.findByText("Vista Diagnóstico")).toBeInTheDocument();
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.vtMode).toBeUndefined();
  });

  it("no dispara startViewTransition al cambiar solo query en la misma ruta, con ctrlKey o skipViewTransition", async () => {
    const user = userEvent.setup();
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return { finished: Promise.resolve() };
    });
    setStartViewTransitionMock(startViewTransition);

    await preloadRouteChunk("/logs", "/");
    renderRouter("/");

    await user.click(
      screen.getByRole("link", { name: "Misma ruta con query" }),
    );
    expect(screen.getByTestId("current-location")).toHaveTextContent("/?tab=2");
    expect(startViewTransition).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Programático misma ruta" }),
    );
    expect(screen.getByTestId("current-location")).toHaveTextContent("/?tab=3");
    expect(startViewTransition).not.toHaveBeenCalled();

    const diagLink = screen.getByRole("link", { name: "Ir a Diagnóstico" });
    fireEvent.click(diagLink, { ctrlKey: true });
    expect(startViewTransition).not.toHaveBeenCalled();

    await user.click(screen.getByRole("link", { name: "Omitir transición" }));
    expect(await screen.findByText("Vista Logs")).toBeInTheDocument();
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it("soporta navegación programática y precarga por hover/focus sin bloquear si tarda", async () => {
    const user = userEvent.setup();
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return { finished: Promise.resolve() };
    });
    setStartViewTransitionMock(startViewTransition);

    const spyConfig = vi
      .spyOn(ROUTE_LOADERS, "configuracion")
      .mockResolvedValue({ default: () => null } as never);
    const spyBackends = vi
      .spyOn(ROUTE_LOADERS, "backends")
      .mockImplementation(() => new Promise(() => {}));

    renderRouter("/");

    const diagLink = screen.getByRole("link", { name: "Ir a Diagnóstico" });
    fireEvent.mouseEnter(diagLink);
    fireEvent.focus(diagLink);

    await user.click(
      screen.getByRole("button", { name: "Navegar programático" }),
    );
    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(1));
    expect(spyConfig).toHaveBeenCalled();
    expect(screen.getByText("Vista Apariencia")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver atrás" }));
    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(2));

    await preloadRouteWithTimeout("/backends", "/", 10);
    expect(spyBackends).toHaveBeenCalled();
  });

  it("resuelve rutas y maneja fallos o transiciones sin `finished` sin romper estado", async () => {
    expect(extractPathnameFromTo("?filtro=1", "/docs/api-guias")).toBe(
      "/docs/api-guias",
    );
    expect(extractPathnameFromTo({ pathname: "/diagnostico/" })).toBe(
      "/diagnostico",
    );
    expect(resolveRouteLoaderKey("/docs/admin/nueva")).toBe("docsNewApi");
    expect(resolveRouteLoaderKey("/docs/admin/clientes")).toBe("docsClients");
    expect(resolveRouteLoaderKey("/docs/mi-api")).toBe("internalDocsViewer");
    expect(resolveRouteLoaderKey("/app-dinamica")).toBeNull();
    expect(isRouteChunkLoaded("/app-dinamica")).toBe(true);
    expect(isSimpleRootTransitionPath("/bienvenida")).toBe(true);
    expect(isSimpleRootTransitionPath("/cliente/login")).toBe(true);
    expect(isSimpleRootTransitionPath("/diagnostico")).toBe(false);

    setStartViewTransitionMock((cb) => {
      cb();
    });
    const updateVoid = vi.fn();
    runRouteViewTransition(updateVoid);
    expect(updateVoid).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(document.documentElement.dataset.vtMode).toBeUndefined();

    setStartViewTransitionMock(() => {
      throw new Error("boom");
    });

    const update = vi.fn();
    runRouteViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.vtMode).toBeUndefined();
  });
});
