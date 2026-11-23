import { useCallback } from "react";
import {
  useLocation,
  useNavigate,
  type NavigateOptions,
  type To,
} from "react-router";
import {
  extractPathnameFromTo,
  isRouteChunkLoaded,
  preloadRouteWithTimeout,
} from "./route-preload";
import { useMovimientoReducido } from "./use-movimiento-reducido";
import {
  isSimpleRootTransitionPath,
  runRouteViewTransition,
  supportsViewTransitions,
} from "./view-transition";

export type TransitionNavigateOptions = NavigateOptions & {
  readonly skipViewTransition?: boolean;
};

export type TransitionNavigateFunction = (
  to: To | number,
  options?: TransitionNavigateOptions,
) => void;

const normalizeLocationPathname = (pathname: string): string => {
  if (!pathname) return "/";
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
};

/**
 * Envuelve `useNavigate()` aplicando View Transitions suaves únicamente cuando cambia la ruta,
 * respetando movimiento reducido, soporte del navegador y precargando chunks lazy.
 */
export const useTransitionNavigate = (): TransitionNavigateFunction => {
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useMovimientoReducido();

  return useCallback(
    (to: To | number, options?: TransitionNavigateOptions) => {
      const skip = Boolean(options?.skipViewTransition);

      if (typeof to === "number") {
        if (reducedMotion || skip || !supportsViewTransitions()) {
          void navigate(to);
          return;
        }
        runRouteViewTransition(() => {
          void navigate(to);
        }, {
          simpleRoot: isSimpleRootTransitionPath(location.pathname),
          reducedMotion,
        });
        return;
      }

      const navOptions: NavigateOptions | undefined = options
        ? {
            replace: options.replace,
            state: options.state,
            preventScrollReset: options.preventScrollReset,
            relative: options.relative,
          }
        : undefined;

      const currentPathname = normalizeLocationPathname(location.pathname);
      const targetPathname = extractPathnameFromTo(to, currentPathname);

      if (
        targetPathname === currentPathname ||
        skip ||
        reducedMotion ||
        !supportsViewTransitions()
      ) {
        void navigate(to, navOptions);
        return;
      }

      const simpleRoot =
        isSimpleRootTransitionPath(currentPathname) ||
        isSimpleRootTransitionPath(targetPathname);

      if (isRouteChunkLoaded(targetPathname)) {
        runRouteViewTransition(
          () => {
            void navigate(to, navOptions);
          },
          { simpleRoot, reducedMotion },
        );
        return;
      }

      void preloadRouteWithTimeout(to, currentPathname, 150).then(() => {
        runRouteViewTransition(
          () => {
            void navigate(to, navOptions);
          },
          { simpleRoot, reducedMotion },
        );
      });
    },
    [location.pathname, navigate, reducedMotion],
  );
};
