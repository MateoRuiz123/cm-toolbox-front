import type { DiagnosticoOutput } from '../../src/features/diagnostico/api/types'

export const diagnosticoOutputFixture: DiagnosticoOutput = {
  veredicto: 'OK',
  items: [
    {
      origen: 'remision',
      codigo_remision: '20018012531',
      cuenta: 'cuenta-prueba',
      veredicto: 'OK',
      resumen: 'La remisión fue migrada correctamente.',
      solucion: [],
      guias: [],
    },
  ],
}

export const diagnosticoEnvelopeFixture = {
  data: diagnosticoOutputFixture,
}

export const diagnosticoErrorFixture = {
  message: 'Error interno en BD',
}
