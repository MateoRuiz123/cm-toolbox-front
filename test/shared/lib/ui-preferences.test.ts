import { beforeEach, describe, expect, it } from "vitest";
import {
  PREFERENCIAS_KEYS,
  guardarPreferenciaDescanso,
  guardarPreferenciaMovimientoReducido,
  guardarPreferenciaSistema,
  obtenerPreferenciaDescanso,
  obtenerPreferenciaMovimientoReducido,
  guardarPreferenciaTema,
  guardarPreferenciaVista,
  obtenerPreferenciaSistema,
  obtenerPreferenciaTema,
  obtenerPreferenciaVista,
  obtenerSnapshotPreferencias,
  restaurarSnapshotPreferencias,
} from "../../../src/shared/lib/ui-preferences";
import { safeStorage } from "../../../src/shared/lib/safe-storage";

describe("ui-preferences", () => {
  beforeEach(() => {
    safeStorage.removeItem(PREFERENCIAS_KEYS.THEME);
    safeStorage.removeItem(PREFERENCIAS_KEYS.VIEW_MODE);
    safeStorage.removeItem(PREFERENCIAS_KEYS.SISTEMA);
  });

  it("guarda y recupera la preferencia de tema", () => {
    expect(obtenerPreferenciaTema()).toBeNull();
    guardarPreferenciaTema("dark");
    expect(obtenerPreferenciaTema()).toBe("dark");
    guardarPreferenciaTema("light");
    expect(obtenerPreferenciaTema()).toBe("light");
  });

  it("guarda y recupera el modo de vista (list / grid)", () => {
    expect(obtenerPreferenciaVista()).toBe("list");
    guardarPreferenciaVista("grid");
    expect(obtenerPreferenciaVista()).toBe("grid");
    guardarPreferenciaVista("list");
    expect(obtenerPreferenciaVista()).toBe("list");
  });

  it("preserva snapshot de preferencias ante reinicios de storage", () => {
    guardarPreferenciaTema("dark");
    guardarPreferenciaVista("grid");
    guardarPreferenciaSistema("visitors");

    const snapshot = obtenerSnapshotPreferencias();
    expect(snapshot.theme).toBe("dark");
    expect(snapshot.viewMode).toBe("grid");
    expect(snapshot.sistema).toBe("visitors");

    safeStorage.removeItem(PREFERENCIAS_KEYS.THEME);
    safeStorage.removeItem(PREFERENCIAS_KEYS.VIEW_MODE);
    safeStorage.removeItem(PREFERENCIAS_KEYS.SISTEMA);

    restaurarSnapshotPreferencias(snapshot);
    expect(obtenerPreferenciaTema()).toBe("dark");
    expect(obtenerPreferenciaVista()).toBe("grid");
    expect(obtenerPreferenciaSistema()).toBe("visitors");
  });

  it("usa SIGO cuando no hay sistema guardado y persiste Visitors y Glass", () => {
    expect(obtenerPreferenciaSistema()).toBe("sigo");
    guardarPreferenciaSistema("visitors");
    expect(obtenerPreferenciaSistema()).toBe("visitors");
    guardarPreferenciaSistema("glass");
    expect(obtenerPreferenciaSistema()).toBe("glass");
    guardarPreferenciaSistema("sigo");
    expect(obtenerPreferenciaSistema()).toBe("sigo");
  });

  it("usa descanso normal por defecto y lo conserva en el snapshot de logout", () => {
    safeStorage.removeItem(PREFERENCIAS_KEYS.DESCANSO);
    expect(obtenerPreferenciaDescanso()).toBe("normal");

    guardarPreferenciaDescanso("calido");
    const snapshot = obtenerSnapshotPreferencias();
    expect(snapshot.descanso).toBe("calido");

    safeStorage.removeItem(PREFERENCIAS_KEYS.DESCANSO);
    expect(obtenerPreferenciaDescanso()).toBe("normal");

    restaurarSnapshotPreferencias(snapshot);
    expect(obtenerPreferenciaDescanso()).toBe("calido");
    safeStorage.removeItem(PREFERENCIAS_KEYS.DESCANSO);
  });

  it("guarda reducir movimiento y lo recupera tras el snapshot", () => {
    safeStorage.removeItem(PREFERENCIAS_KEYS.MOVIMIENTO);
    expect(obtenerPreferenciaMovimientoReducido()).toBe(false);

    guardarPreferenciaMovimientoReducido(true);
    const snapshot = obtenerSnapshotPreferencias();
    expect(snapshot.movimiento).toBe("reducido");

    safeStorage.removeItem(PREFERENCIAS_KEYS.MOVIMIENTO);
    restaurarSnapshotPreferencias(snapshot);
    expect(obtenerPreferenciaMovimientoReducido()).toBe(true);
    safeStorage.removeItem(PREFERENCIAS_KEYS.MOVIMIENTO);
  });
});
