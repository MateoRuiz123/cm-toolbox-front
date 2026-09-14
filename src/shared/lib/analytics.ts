declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

export interface AnalyticsEvent {
  name: string
  category?: string
  label?: string
  value?: number
  metadata?: Record<string, unknown>
}

/**
 * Registra una vista de página en el portal.
 */
export const trackPageView = (path: string): void => {
  const timestamp = new Date().toISOString()

  if (typeof window !== 'undefined') {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: 'page_view',
        page_path: path,
        page_title: document.title,
        timestamp,
      })
    }

    window.dispatchEvent(
      new CustomEvent('cm_analytics_pageview', {
        detail: { path, title: document.title, timestamp },
      }),
    )

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[Analytics] PageView: ${path}`)
    }
  }
}

/**
 * Registra un evento de interacción operativa en el portal.
 */
export const trackEvent = (event: AnalyticsEvent): void => {
  const timestamp = new Date().toISOString()

  if (typeof window !== 'undefined') {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: event.name,
        event_category: event.category || 'general',
        event_label: event.label,
        event_value: event.value,
        timestamp,
        ...event.metadata,
      })
    }

    window.dispatchEvent(
      new CustomEvent('cm_analytics_event', {
        detail: { ...event, timestamp },
      }),
    )

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[Analytics] Event: ${event.name}`, event)
    }
  }
}
