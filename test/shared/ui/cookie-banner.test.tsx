import { describe, expect, it, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RouterProvider } from '../../../src/shared/router/router-context'
import { CookieBanner } from '../../../src/shared/ui/cookie-banner'
import { safeStorage } from '../../../src/shared/lib/safe-storage'

describe('CookieBanner', () => {
  beforeEach(() => {
    safeStorage.removeItem('cm_cookie_consent')
  })

  it('renderiza el banner si no hay consentimiento previo', () => {
    const html = renderToString(
      <RouterProvider initialPath="/">
        <CookieBanner />
      </RouterProvider>,
    )

    expect(html).toContain('Uso de Cookies y Almacenamiento Local')
    expect(html).toContain('Aceptar todas')
    expect(html).toContain('Solo esenciales')
  })

  it('no renderiza contenido si ya se guardó la preferencia', () => {
    safeStorage.setItem('cm_cookie_consent', 'accepted')

    const html = renderToString(
      <RouterProvider initialPath="/">
        <CookieBanner />
      </RouterProvider>,
    )

    expect(html).toBe('')
  })
})
