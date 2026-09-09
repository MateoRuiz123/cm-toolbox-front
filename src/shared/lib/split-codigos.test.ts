import { describe, expect, it } from 'vitest'
import { parseDespachos, splitCodigos } from './split-codigos'

describe('splitCodigos', () => {
  it('separa, limpia y elimina códigos duplicados', () => {
    expect(splitCodigos('REM1, REM2\nREM1; REM3')).toEqual(['REM1', 'REM2', 'REM3'])
  })
})

describe('parseDespachos', () => {
  it('convierte despachos válidos a números', () => {
    expect(parseDespachos('123, 456')).toEqual({ values: [123, 456], error: null })
  })

  it('rechaza valores que no son numéricos', () => {
    expect(parseDespachos('123, ABC')).toEqual({
      values: [],
      error: 'El despacho “ABC” debe contener solo números.',
    })
  })
})
