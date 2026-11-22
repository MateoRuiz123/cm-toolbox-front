import { beforeEach, describe, expect, it } from "vitest";
import {
  PREFERENCIAS_KEYS,
  guardarPreferenciaDescanso,
  guardarPreferenciaHubLayout,
  guardarPreferenciaMovimientoReducido,
  guardarPreferenciaSistema,
  obtenerPreferenciaDescanso,
  obtenerPreferenciaHubLayout,
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
    guardarPreferenciaSistema("sigo");

    const snapshot = obtenerSnapshotPreferencias();
    expect(snapshot.theme).toBe("dark");
    expect(snapshot.viewMode).toBe("grid");
    expect(snapshot.sistema).toBe("sigo");

    safeStorage.removeItem(PREFERENCIAS_KEYS.THEME);
    safeStorage.removeItem(PREFERENCIAS_KEYS.VIEW_MODE);
    safeStorage.removeItem(PREFERENCIAS_KEYS.SISTEMA);

    restaurarSnapshotPreferencias(snapshot);
    expect(obtenerPreferenciaTema()).toBe("dark");
    expect(obtenerPreferenciaVista()).toBe("grid");
    expect(obtenerPreferenciaSistema()).toBe("sigo");
  });

  it("resuelve siempre a SIGO aunque existan valores legados (visitors / glass)", () => {
    expect(obtenerPreferenciaSistema()).toBe("sigo");
    safeStorage.setItem(PREFERENCIAS_KEYS.SISTEMA, "visitors");
    expect(obtenerPreferenciaSistema()).toBe("sigo");
    safeStorage.setItem(PREFERENCIAS_KEYS.SISTEMA, "glass");
    expect(obtenerPreferenciaSistema()).toBe("sigo");
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

  it("usa vista PS5 por defecto y conserva bento en el snapshot", () => {
    safeStorage.removeItem(PREFERENCIAS_KEYS.HUB_LAYOUT);
    expect(obtenerPreferenciaHubLayout()).toBe("ps5");

    guardarPreferenciaHubLayout("bento");
    const snapshot = obtenerSnapshotPreferencias();
    expect(snapshot.hubLayout).toBe("bento");

    safeStorage.removeItem(PREFERENCIAS_KEYS.HUB_LAYOUT);
    restaurarSnapshotPreferencias(snapshot);
    expect(obtenerPreferenciaHubLayout()).toBe("bento");
    safeStorage.removeItem(PREFERENCIAS_KEYS.HUB_LAYOUT);
  });
});
