import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DiagnosticoOutput } from '../../../src/features/diagnostico/api/types'
import { ResultadoDiagnostico } from '../../../src/features/diagnostico/resultado-diagnostico'
import { diagnosticoOutputConGuiaParcial } from '../../fixtures/diagnostico'

vi.mock('../../../src/features/diagnostico/api/diagnostico-api', () => ({
  reintentarMigracionGuia: vi.fn(),
  asignarEquipoDespachoTesting: vi.fn(),
}))

const { reintentarMigracionGuia, asignarEquipoDespachoTesting } = await import(
  '../../../src/features/diagnostico/api/diagnostico-api'
)

const buildRemisionConDespacho = (esTesting: boolean): DiagnosticoOutput => ({
  veredicto: 'PARCIAL',
  es_testing: esTesting,
  items: [
    {
      origen: 'remision',
      codigo_remision: '73941472494',
      codigo_despacho: 56727471,
      id_cliente: 123,
      equipo: null,
      recibidor: null,
      movil: null,
      cuenta: 'Cuenta Corriente',
      veredicto: 'PARCIAL',
      resumen: 'Falta equipo y recibidor.',
      solucion: [],
      guias: [
        {
          codigo_remision: '73941472494',
          veredicto: 'PARCIAL',
          resumen: 'El despacho necesita equipo y recibidor para que func_agaremesas se ejecute.',
          solucion: ['Actualizar despacho en AGW'],
          checks: [
            {
              id: 'gate_equipo_recibidor',
              nombre: 'Equipo y recibidor válidos',
              resultado: 'no_cumple',
            },
          ],
        },
      ],
    },
  ],
})

describe('ResultadoDiagnostico', () => {
  afterEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('marca éxito tras reintentar una guía con veredicto distinto de OK', async () => {
    vi.mocked(reintentarMigracionGuia).mockResolvedValue({
      codigo_remision: '20018012531',
      success: true,
      message: 'Migración solicitada correctamente.',
    })

    const user = userEvent.setup()
    render(
      <ResultadoDiagnostico
        data={diagnosticoOutputConGuiaParcial}
        onRediagnosticar={() => undefined}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^reintentar$/i }))

    await waitFor(() => {
      expect(screen.getByText('Enviada')).toBeInTheDocument()
    })
    expect(reintentarMigracionGuia).toHaveBeenCalledWith('20018012531')
  })

  it('muestra error cuando el reintento falla', async () => {
    vi.mocked(reintentarMigracionGuia).mockResolvedValue({
      codigo_remision: '20018012531',
      success: false,
      message: 'Error interno en BD',
    })

    const user = userEvent.setup()
    render(
      <ResultadoDiagnostico
        data={diagnosticoOutputConGuiaParcial}
        onRediagnosticar={() => undefined}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^reintentar$/i }))

    await waitFor(() => {
      expect(reintentarMigracionGuia).toHaveBeenCalled()
    })
  })

  it('muestra el codigo_despacho al consultar por remisión y permite asignar equipo/recibidor/movil en testing para luego reintentar', async () => {
    vi.mocked(asignarEquipoDespachoTesting).mockResolvedValue({
      id_cliente: 123,
      codigo_despacho: 56727471,
      equipo: 'EQ09',
      recibidor: 45,
      movil: 'MOV09',
    })
    vi.mocked(reintentarMigracionGuia).mockResolvedValue({
      codigo_remision: '73941472494',
      success: true,
      message: 'Migración solicitada correctamente.',
    })

    const user = userEvent.setup()
    render(
      <ResultadoDiagnostico
        data={buildRemisionConDespacho(true)}
        onRediagnosticar={() => undefined}
      />,
    )

    expect(screen.getAllByText('Despacho 56727471').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: /asignar equipo en agw_despachos \(testing\)/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cuadros/i }))
    await user.click(screen.getByRole('button', { name: /asignar equipo \(testing\)/i }))

    await user.type(screen.getByLabelText(/equipo \*/i), 'EQ09')
    await user.type(screen.getByLabelText(/recibidor \*/i), '45')
    await user.type(screen.getByLabelText(/móvil/i), 'MOV09')

    await user.click(screen.getByRole('button', { name: /guardar y reintentar migración/i }))

    await waitFor(() => {
      expect(asignarEquipoDespachoTesting).toHaveBeenCalledWith({
        id_cliente: 123,
        codigo_despacho: 56727471,
        equipo: 'EQ09',
        recibidor: 45,
        movil: 'MOV09',
      })
    })

    await waitFor(() => {
      expect(reintentarMigracionGuia).toHaveBeenCalledWith('73941472494')
    })

    expect(await screen.findByText(/migración solicitada correctamente/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar y reintentar migración/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /cerrar y re-diagnosticar/i })).toBeInTheDocument()
  })

  it('no muestra el formulario de asignación de equipo cuando es_testing es false', async () => {
    const user = userEvent.setup()
    render(<ResultadoDiagnostico data={buildRemisionConDespacho(false)} />)

    await user.click(screen.getByRole('button', { name: /cuadros/i }))

    expect(screen.getAllByText('Despacho 56727471').length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: /asignar equipo \(testing\)/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /detalle/i }))
    expect(screen.queryByLabelText(/equipo \*/i)).not.toBeInTheDocument()
  })
})
