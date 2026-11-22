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
  guardarPreferenciaHubLayout,
  guardarPreferenciaMovimientoReducido,
  guardarPreferenciaSistema,
  guardarPreferenciaTema,
  obtenerPreferenciaDescanso,
  obtenerPreferenciaHubLayout,
  obtenerPreferenciaMovimientoReducido,
  obtenerPreferenciaSistema,
  obtenerPreferenciaTema,
  type ModoDescanso,
  type ModoHubLayout,
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
  const [sistema] = useState<SistemaVisual>(obtenerPreferenciaSistema);
  const [descanso, setDescansoEstado] = useState<ModoDescanso>(
    obtenerPreferenciaDescanso,
  );
  const [movimientoReducido, setMovimientoReducidoEstado] = useState(
    obtenerPreferenciaMovimientoReducido,
  );
  const [hubLayout, setHubLayoutEstado] = useState<ModoHubLayout>(
    obtenerPreferenciaHubLayout,
  );

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle("dark", theme === "dark");
    delete raiz.dataset.sistema;
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
    guardarPreferenciaHubLayout(hubLayout);
  }, [theme, sistema, descanso, movimientoReducido, hubLayout]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    conTransicionSuave(() => setTheme(nextTheme));
  }, [theme]);

  const setSistema = useCallback(() => {
    guardarPreferenciaSistema("sigo");
  }, []);

  const setDescanso = useCallback((siguiente: ModoDescanso) => {
    conTransicionSuave(() => setDescansoEstado(siguiente));
  }, []);

  const toggleDescanso = useCallback(() => {
    setDescanso(descanso === "calido" ? "normal" : "calido");
  }, [descanso, setDescanso]);

  const setMovimientoReducido = useCallback((reducido: boolean) => {
    setMovimientoReducidoEstado(reducido);
  }, []);

  const setHubLayout = useCallback((modo: ModoHubLayout) => {
    setHubLayoutEstado(modo);
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
      hubLayout,
      setHubLayout,
    }),
    [
      theme,
      toggleTheme,
      sistema,
      setSistema,
      descanso,
      setDescanso,
      toggleDescanso,
      movimientoReducido,
      setMovimientoReducido,
      hubLayout,
      setHubLayout,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
