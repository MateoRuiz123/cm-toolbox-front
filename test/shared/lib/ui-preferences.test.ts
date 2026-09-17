import { beforeEach, describe, expect, it } from 'vitest'
import {
  PREFERENCIAS_KEYS,
  guardarPreferenciaTema,
  guardarPreferenciaVista,
  obtenerPreferenciaTema,
  obtenerPreferenciaVista,
  obtenerSnapshotPreferencias,
  restaurarSnapshotPreferencias,
} from '../../../src/shared/lib/ui-preferences'
import { safeStorage } from '../../../src/shared/lib/safe-storage'

describe('ui-preferences', () => {
  beforeEach(() => {
    safeStorage.removeItem(PREFERENCIAS_KEYS.THEME)
    safeStorage.removeItem(PREFERENCIAS_KEYS.VIEW_MODE)
  })

  it('guarda y recupera la preferencia de tema', () => {
    expect(obtenerPreferenciaTema()).toBeNull()
    guardarPreferenciaTema('dark')
    expect(obtenerPreferenciaTema()).toBe('dark')
    guardarPreferenciaTema('light')
    expect(obtenerPreferenciaTema()).toBe('light')
  })

  it('guarda y recupera el modo de vista (list / grid)', () => {
    expect(obtenerPreferenciaVista()).toBe('list')
    guardarPreferenciaVista('grid')
    expect(obtenerPreferenciaVista()).toBe('grid')
    guardarPreferenciaVista('list')
    expect(obtenerPreferenciaVista()).toBe('list')
  })

  it('preserva snapshot de preferencias ante reinicios de storage', () => {
    guardarPreferenciaTema('dark')
    guardarPreferenciaVista('grid')

    const snapshot = obtenerSnapshotPreferencias()
    expect(snapshot.theme).toBe('dark')
    expect(snapshot.viewMode).toBe('grid')

    // Simula borrado completo
    safeStorage.removeItem(PREFERENCIAS_KEYS.THEME)
    safeStorage.removeItem(PREFERENCIAS_KEYS.VIEW_MODE)

    restaurarSnapshotPreferencias(snapshot)
    expect(obtenerPreferenciaTema()).toBe('dark')
    expect(obtenerPreferenciaVista()).toBe('grid')
  })
})
