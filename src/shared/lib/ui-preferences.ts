import { safeStorage } from "./safe-storage";

export type ModoVista = "list" | "grid";
export type ModoTema = "light" | "dark";
export type SistemaVisual = "sigo" | "visitors" | "glass";
export type ModoDescanso = "normal" | "calido";

export const PREFERENCIAS_KEYS = {
  THEME: "theme",
  VIEW_MODE: "diagnostico_view_mode",
  SISTEMA: "sistema_visual",
  DESCANSO: "descanso_visual",
  MOVIMIENTO: "reducir_movimiento",
} as const;

export interface PreferenciasUI {
  theme: string | null;
  viewMode: string | null;
  sistema: string | null;
  descanso?: string | null;
  movimiento?: string | null;
}

/** Obtiene el tema guardado o null si no se ha configurado. */
export const obtenerPreferenciaTema = (): ModoTema | null => {
  const guardado = safeStorage.getItem(PREFERENCIAS_KEYS.THEME);
  if (guardado === "light" || guardado === "dark") {
    return guardado;
  }
  return null;
};

/** Guarda la preferencia de tema (claro u oscuro). */
export const guardarPreferenciaTema = (tema: ModoTema): void => {
  safeStorage.setItem(PREFERENCIAS_KEYS.THEME, tema);
};

/** Obtiene la preferencia de vista (lista o cuadros/cuadrícula). */
export const obtenerPreferenciaVista = (): ModoVista => {
  const guardado = safeStorage.getItem(PREFERENCIAS_KEYS.VIEW_MODE);
  return guardado === "grid" ? "grid" : "list";
};

/** Guarda la preferencia de vista (lista o cuadros). */
export const guardarPreferenciaVista = (vista: ModoVista): void => {
  safeStorage.setItem(PREFERENCIAS_KEYS.VIEW_MODE, vista);
};

/** Obtiene el sistema visual guardado. SIGO es el valor por defecto. */
export const obtenerPreferenciaSistema = (): SistemaVisual => {
  const guardado = safeStorage.getItem(PREFERENCIAS_KEYS.SISTEMA);
  if (guardado === "visitors" || guardado === "glass") {
    return guardado;
  }
  return "sigo";
};

/** Guarda el sistema visual (SIGO Droop, Visitors o Glass Spatial). */
export const guardarPreferenciaSistema = (sistema: SistemaVisual): void => {
  safeStorage.setItem(PREFERENCIAS_KEYS.SISTEMA, sistema);
};

/** Obtiene el modo de descanso visual guardado. Normal es el valor por defecto. */
export const obtenerPreferenciaDescanso = (): ModoDescanso => {
  const guardado = safeStorage.getItem(PREFERENCIAS_KEYS.DESCANSO);
  return guardado === "calido" ? "calido" : "normal";
};

/** Guarda el modo de descanso visual (normal o tono cálido). */
export const guardarPreferenciaDescanso = (descanso: ModoDescanso): void => {
  safeStorage.setItem(PREFERENCIAS_KEYS.DESCANSO, descanso);
};

/** Indica si el usuario pidió reducir el movimiento, además de la preferencia del sistema. */
export const obtenerPreferenciaMovimientoReducido = (): boolean =>
  safeStorage.getItem(PREFERENCIAS_KEYS.MOVIMIENTO) === "reducido";

/** Guarda el interruptor de reducir movimiento. */
export const guardarPreferenciaMovimientoReducido = (
  reducido: boolean,
): void => {
  safeStorage.setItem(
    PREFERENCIAS_KEYS.MOVIMIENTO,
    reducido ? "reducido" : "sistema",
  );
};

/** Extrae snapshot de las preferencias de UI para que sobrevivan a limpiezas de sesión/logout. */
export const obtenerSnapshotPreferencias = (): PreferenciasUI => ({
  theme: safeStorage.getItem(PREFERENCIAS_KEYS.THEME),
  viewMode: safeStorage.getItem(PREFERENCIAS_KEYS.VIEW_MODE),
  sistema: safeStorage.getItem(PREFERENCIAS_KEYS.SISTEMA),
  descanso: safeStorage.getItem(PREFERENCIAS_KEYS.DESCANSO),
  movimiento: safeStorage.getItem(PREFERENCIAS_KEYS.MOVIMIENTO),
});

/** Restaura snapshot de preferencias de UI tras un logout o reseteo de almacenamiento. */
export const restaurarSnapshotPreferencias = (prefs: PreferenciasUI): void => {
  if (prefs.theme) safeStorage.setItem(PREFERENCIAS_KEYS.THEME, prefs.theme);
  if (prefs.viewMode)
    safeStorage.setItem(PREFERENCIAS_KEYS.VIEW_MODE, prefs.viewMode);
  if (prefs.sistema)
    safeStorage.setItem(PREFERENCIAS_KEYS.SISTEMA, prefs.sistema);
  if (prefs.descanso)
    safeStorage.setItem(PREFERENCIAS_KEYS.DESCANSO, prefs.descanso);
  if (prefs.movimiento)
    safeStorage.setItem(PREFERENCIAS_KEYS.MOVIMIENTO, prefs.movimiento);
};
