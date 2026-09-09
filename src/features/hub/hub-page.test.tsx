import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { HubPage } from './hub-page'
import { RouterProvider } from '../../shared/router/router-context'

describe('HubPage', () => {
  it('renderiza la tarjeta de Diagnóstico de Migración con enlace hacia /diagnostico', () => {
    const html = renderToString(
      <RouterProvider initialPath="/">
        <HubPage />
      </RouterProvider>,
    )

    expect(html).toContain('Portal de Aplicaciones de Apoyo')
    expect(html).toContain('Diagnóstico de Migración')
    expect(html).toContain('href="/diagnostico"')
    expect(html).toContain('Abrir herramienta')
  })

  it('muestra tarjetas de próximas aplicaciones en estado deshabilitado', () => {
    const html = renderToString(
      <RouterProvider initialPath="/">
        <HubPage />
      </RouterProvider>,
    )

    expect(html).toContain('Monitoreo Pub/Sub')
    expect(html).toContain('Próximamente')
    expect(html).toContain('En construcción')
  })
})
