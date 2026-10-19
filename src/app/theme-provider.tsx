import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  guardarPreferenciaDescanso,
  guardarPreferenciaMovimientoReducido,
  guardarPreferenciaSistema,
  guardarPreferenciaTema,
  obtenerPreferenciaDescanso,
  obtenerPreferenciaMovimientoReducido,
  obtenerPreferenciaSistema,
  obtenerPreferenciaTema,
  type ModoDescanso,
  type SistemaVisual,
} from "../shared/lib/ui-preferences";
import { ThemeContext, type Theme } from "./theme-context";

const getInitialTheme = (): Theme => {
  const savedTheme = obtenerPreferenciaTema();
  if (savedTheme) return savedTheme;
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

let fuenteVisitorsPromesa: Promise<unknown> | null = null;

const cargarFuenteVisitors = () => {
  if (fuenteVisitorsPromesa) return;
  fuenteVisitorsPromesa = Promise.all([
    import("@fontsource/inter/400.css"),
    import("@fontsource/inter/500.css"),
    import("@fontsource/inter/600.css"),
    import("@fontsource/inter/700.css"),
  ]).catch(() => undefined);
};

/** Aplica un cambio de estado con fundido de View Transitions si el navegador lo soporta y no hay reduced motion. */
const conTransicionSuave = (aplicar: () => void) => {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => void;
  };

  const movimientoReducido =
    document.documentElement.dataset.movimiento === "reducido" ||
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || movimientoReducido) {
    aplicar();
    return;
  }

  doc.startViewTransition(() => {
    flushSync(aplicar);
  });
};

/** Sincroniza y expone el tema visual de la aplicación. */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [sistema, setSistema] = useState<SistemaVisual>(
    obtenerPreferenciaSistema,
  );
  const [descanso, setDescansoEstado] = useState<ModoDescanso>(
    obtenerPreferenciaDescanso,
  );
  const [movimientoReducido, setMovimientoReducidoEstado] = useState(
    obtenerPreferenciaMovimientoReducido,
  );

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle("dark", theme === "dark");
    if (sistema === "visitors") {
      raiz.dataset.sistema = "visitors";
      cargarFuenteVisitors();
    } else {
      delete raiz.dataset.sistema;
    }
    if (descanso === "calido") {
      raiz.dataset.descanso = "calido";
    } else {
      delete raiz.dataset.descanso;
    }
    if (movimientoReducido) {
      raiz.dataset.movimiento = "reducido";
    } else {
      delete raiz.dataset.movimiento;
    }
    guardarPreferenciaTema(theme);
    guardarPreferenciaSistema(sistema);
    guardarPreferenciaDescanso(descanso);
    guardarPreferenciaMovimientoReducido(movimientoReducido);
  }, [theme, sistema, descanso, movimientoReducido]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    conTransicionSuave(() => setTheme(nextTheme));
  }, [theme]);

  const setDescanso = useCallback((siguiente: ModoDescanso) => {
    conTransicionSuave(() => setDescansoEstado(siguiente));
  }, []);

  const toggleDescanso = useCallback(() => {
    setDescanso(descanso === "calido" ? "normal" : "calido");
  }, [descanso, setDescanso]);

  const setMovimientoReducido = useCallback((reducido: boolean) => {
    setMovimientoReducidoEstado(reducido);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      sistema,
      setSistema,
      descanso,
      setDescanso,
      toggleDescanso,
      movimientoReducido,
      setMovimientoReducido,
    }),
    [
      theme,
      toggleTheme,
      sistema,
      descanso,
      setDescanso,
      toggleDescanso,
      movimientoReducido,
      setMovimientoReducido,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
