import { describe, expect, it } from 'vitest'
import { safeStorage } from './safe-storage'

describe('safeStorage', () => {
  it('guarda y recupera valores correctamente', () => {
    safeStorage.setItem('test_key', 'test_val')
    expect(safeStorage.getItem('test_key')).toBe('test_val')
  })

  it('devuelve null si la clave no existe', () => {
    expect(safeStorage.getItem('non_existent_key_12345')).toBeNull()
  })

  it('elimina claves correctamente', () => {
    safeStorage.setItem('key_to_delete', 'value')
    safeStorage.removeItem('key_to_delete')
    expect(safeStorage.getItem('key_to_delete')).toBeNull()
  })
})
