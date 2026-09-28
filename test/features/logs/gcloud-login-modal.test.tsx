import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GcloudLoginModal } from '../../../src/features/logs/gcloud-login-modal'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  readyState = 1
  sent: string[] = []

  constructor(_url: string) {
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {}
}

vi.mock('../../../src/features/logs/api/logs-api', () => ({
  createLogsWebSocket: () => new MockWebSocket('ws://test'),
  authenticateLogsWebSocket: (ws: MockWebSocket) => {
    ws.send(JSON.stringify({ action: 'authenticate', token: '' }))
  },
  parseLogStreamMessage: (raw: string) => JSON.parse(raw),
}))

describe('GcloudLoginModal', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('autentica y después solicita gcloud-login', async () => {
    render(<GcloudLoginModal open onClose={() => {}} onSuccess={() => {}} />)

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0)
    })

    const ws = MockWebSocket.instances[0]
    ws.onopen?.()
    expect(ws.sent).toContain(JSON.stringify({ action: 'authenticate', token: '' }))

    ws.onmessage?.({ data: JSON.stringify({ type: 'authenticated' }) })
    expect(ws.sent).toContain(JSON.stringify({ action: 'gcloud-login' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('muestra enlace cuando llega gcloud-login-url', async () => {
    render(<GcloudLoginModal open onClose={() => {}} onSuccess={() => {}} />)

    await waitFor(() => expect(MockWebSocket.instances[0]).toBeDefined())

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'gcloud-login-url',
        url: 'https://accounts.google.com/o/oauth2/auth?test=1',
      }),
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /abrir login de google/i })).toBeTruthy()
    })
  })
})
