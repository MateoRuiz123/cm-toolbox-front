import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { trackPageView, trackEvent } from '../../../src/shared/lib/analytics'

describe('Analytics Utility', () => {
  const originalWindow = globalThis.window

  beforeEach(() => {
    vi.restoreAllMocks()
    const dispatchMock = vi.fn()
    const mockWindow = {
      dataLayer: [] as unknown[],
      dispatchEvent: dispatchMock,
      location: { href: 'http://localhost:3000/diagnostico' },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.window = mockWindow as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.document = { title: 'Test Title' } as any
  })

  afterEach(() => {
    globalThis.window = originalWindow
  })

  it('trackPageView registra el evento en dataLayer y despacha custom event', () => {
    trackPageView('/diagnostico')

    expect(window.dataLayer).toBeDefined()
    expect(window.dataLayer?.length).toBe(1)
    const entry = (window.dataLayer as Array<Record<string, unknown>>)[0]
    expect(entry.event).toBe('page_view')
    expect(entry.page_path).toBe('/diagnostico')
    expect(window.dispatchEvent).toHaveBeenCalled()
  })

  it('trackEvent registra eventos operacionales personalizados', () => {
    trackEvent({
      name: 'remigracion_masiva',
      category: 'operaciones',
      label: '5_guias',
      value: 5,
    })

    expect(window.dataLayer?.length).toBe(1)
    const entry = (window.dataLayer as Array<Record<string, unknown>>)[0]
    expect(entry.event).toBe('remigracion_masiva')
    expect(entry.event_category).toBe('operaciones')
    expect(entry.event_label).toBe('5_guias')
    expect(entry.event_value).toBe(5)
    expect(window.dispatchEvent).toHaveBeenCalled()
  })
})
