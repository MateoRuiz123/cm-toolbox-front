export const diagnosticoOkResponse = {
  data: {
    veredicto: 'OK',
    items: [
      {
        origen: 'remision',
        codigo_remision: '20018012531',
        cuenta: 'cuenta-e2e',
        veredicto: 'OK',
        resumen: 'La remisión fue migrada correctamente.',
        solucion: [],
        guias: [],
      },
    ],
  },
}

export const diagnosticoParcialResponse = {
  data: {
    veredicto: 'PARCIAL',
    items: [
      {
        origen: 'remision',
        codigo_remision: '20018012531',
        cuenta: 'cuenta-e2e',
        veredicto: 'PARCIAL',
        resumen: 'Requiere reintento.',
        solucion: [],
        guias: [
          {
            codigo_remision: '20018012531',
            veredicto: 'PARCIAL',
            resumen: 'Guía con inconsistencias detectadas.',
            solucion: [],
            checks: [],
          },
        ],
      },
    ],
  },
}

export const guiaOkResponse = {
  state: true,
  message: 'Guía encolada para migración',
}
