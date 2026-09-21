import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultadoDiagnostico } from '../../../src/features/diagnostico/resultado-diagnostico'
import { diagnosticoOutputConGuiaParcial } from '../../fixtures/diagnostico'

vi.mock('../../../src/features/diagnostico/api/diagnostico-api', () => ({
  reintentarMigracionGuia: vi.fn(),
}))

const { reintentarMigracionGuia } = await import(
  '../../../src/features/diagnostico/api/diagnostico-api'
)

describe('ResultadoDiagnostico', () => {
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
})
