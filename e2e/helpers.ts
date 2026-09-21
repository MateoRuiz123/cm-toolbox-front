import type { Page } from '@playwright/test'

export const dismissCookieBanner = async (page: Page) => {
  const essential = page.getByRole('button', { name: /solo esenciales/i })
  if (await essential.isVisible().catch(() => false)) {
    await essential.click()
  }
}

export const mockDiagnosticoSuccess = async (page: Page) => {
  const { diagnosticoOkResponse } = await import('./fixtures/api-responses')
  await page.route('**/migracion/diagnostico', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(diagnosticoOkResponse),
    })
  })
}

export const mockDiagnosticoError = async (page: Page) => {
  await page.route('**/migracion/diagnostico', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Error interno en BD' }),
    })
  })
}

export const mockGuiaSuccess = async (page: Page) => {
  const { guiaOkResponse } = await import('./fixtures/api-responses')
  await page.route('**/migracion/guia', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(guiaOkResponse),
    })
  })
}

export const mockDiagnosticoParcial = async (page: Page) => {
  const { diagnosticoParcialResponse } = await import('./fixtures/api-responses')
  await page.route('**/migracion/diagnostico', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(diagnosticoParcialResponse),
    })
  })
}
