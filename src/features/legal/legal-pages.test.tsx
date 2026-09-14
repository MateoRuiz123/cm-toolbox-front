import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RouterProvider } from '../../shared/router/router-context'
import { PrivacyPage } from './privacy-page'
import { TermsPage } from './terms-page'
import { ContactPage } from '../contact/contact-page'
import { NotFoundPage } from '../not-found/not-found-page'
import { ThankYouPage } from '../feedback/thank-you-page'

describe('Páginas Legales y de Estado', () => {
  it('renderiza PrivacyPage con información de la Ley 1581 de 2012', () => {
    const html = renderToString(
      <RouterProvider initialPath="/privacidad">
        <PrivacyPage />
      </RouterProvider>,
    )

    expect(html).toContain('Política de Privacidad')
    expect(html).toContain('Ley 1581 de 2012')
    expect(html).toContain('Coordinadora Mercantil S.A.')
  })

  it('renderiza TermsPage con condiciones de uso autorizado', () => {
    const html = renderToString(
      <RouterProvider initialPath="/terminos">
        <TermsPage />
      </RouterProvider>,
    )

    expect(html).toContain('Términos y Condiciones de Uso')
    expect(html).toContain('Ámbito de Aplicación')
    expect(html).toContain('Coordinadora Mercantil S.A.')
  })

  it('renderiza ContactPage con sede principal y PBX', () => {
    const html = renderToString(
      <RouterProvider initialPath="/contacto">
        <ContactPage />
      </RouterProvider>,
    )

    expect(html).toContain('Contacto y Soporte de TI')
    expect(html).toContain('Calle 30A # 6-38, Medellín')
    expect(html).toContain('+57 (604) 310 3100')
    expect(html).toContain('soporte.ti@coordinadora.com')
  })

  it('renderiza NotFoundPage con código 404 y enlaces de retorno', () => {
    const html = renderToString(
      <RouterProvider initialPath="/ruta-inexistente">
        <NotFoundPage />
      </RouterProvider>,
    )

    expect(html).toContain('404')
    expect(html).toContain('La página solicitada no está disponible')
    expect(html).toContain('Ir al Portal Principal')
  })

  it('renderiza ThankYouPage con confirmación de radicado', () => {
    const html = renderToString(
      <RouterProvider initialPath="/gracias">
        <ThankYouPage />
      </RouterProvider>,
    )

    expect(html).toContain('¡Mensaje Enviado con Éxito!')
    expect(html).toContain('Radicado Satisfactoriamente')
  })
})
