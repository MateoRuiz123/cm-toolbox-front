import { flushSync } from "react-dom";

interface ViewTransitionLike {
  readonly finished?: Promise<unknown>;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike | void;
};

export interface RouteViewTransitionOptions {
  readonly simpleRoot?: boolean;
  readonly reducedMotion?: boolean;
}

let activeTransitionSeq = 0;

const clearRouteVtMode = (seq: number): void => {
  if (typeof document === "undefined") return;
  if (activeTransitionSeq === seq) {
    delete document.documentElement.dataset.vtMode;
  }
};

const isReducedMotionActive = (explicit?: boolean): boolean => {
  if (explicit) return true;
  if (typeof document !== "undefined") {
    if (document.documentElement.dataset.movimiento === "reducido") {
      return true;
    }
  }
  return (
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
};

/** Indica si el navegador actual expone la View Transitions API. */
export const supportsViewTransitions = (): boolean =>
  typeof document !== "undefined" &&
  typeof (document as DocumentWithViewTransition).startViewTransition ===
    "function";

/**
 * Determina si una ruta pertenece a un área sin cabecera/pie institucional (`/bienvenida`, `/cliente/*`)
 * donde corresponde usar la transición simple sobre `root`.
 */
export const isSimpleRootTransitionPath = (pathname: string): boolean =>
  pathname === "/bienvenida" ||
  pathname.startsWith("/bienvenida/") ||
  pathname === "/cliente" ||
  pathname.startsWith("/cliente/");

/**
 * Ejecuta una actualización de ruta envuelta en `document.startViewTransition` con limpieza segura
 * de `data-vt-mode="route"` para coexistir con el cambio de tema.
 */
export const runRouteViewTransition = (
  update: () => void,
  options?: RouteViewTransitionOptions,
): void => {
  if (
    isReducedMotionActive(options?.reducedMotion) ||
    !supportsViewTransitions()
  ) {
    update();
    return;
  }

  const doc = document as DocumentWithViewTransition;
  if (!doc.startViewTransition) {
    update();
    return;
  }

  const seq = ++activeTransitionSeq;
  if (options?.simpleRoot) {
    delete document.documentElement.dataset.vtMode;
  } else {
    document.documentElement.dataset.vtMode = "route";
  }

  try {
    const transition = doc.startViewTransition(() => {
      flushSync(update);
    });

    if (
      transition &&
      typeof transition === "object" &&
      transition.finished &&
      typeof transition.finished.finally === "function"
    ) {
      void transition.finished
        .catch(() => undefined)
        .finally(() => {
          clearRouteVtMode(seq);
        });
    } else {
      queueMicrotask(() => {
        clearRouteVtMode(seq);
      });
    }
  } catch {
    clearRouteVtMode(seq);
    update();
  }
};
