import { describe, expect, it } from 'vitest'
import template from '../../nginx/default.conf.template?raw'

describe('nginx/default.conf.template — cabeceras de seguridad', () => {
  it('define Content-Security-Policy con connect-src hacia API y Keycloak', () => {
    expect(template).toContain('Content-Security-Policy')
    expect(template).toContain("connect-src 'self'")
    expect(template).toContain('${DIAGNOSTICO_API_UPSTREAM}')
    expect(template).toContain('${KEYCLOAK_UPSTREAM}')
  })

  it('conserva cabeceras duras complementarias', () => {
    expect(template).toContain('X-Content-Type-Options nosniff')
    expect(template).toContain('Referrer-Policy same-origin')
    expect(template).toContain('X-Frame-Options SAMEORIGIN')
  })
})
