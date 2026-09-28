import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  authenticateLogsWebSocket,
  createLogsWebSocket,
  parseLogStreamMessage,
} from './api/logs-api'

interface GcloudLoginModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly onSuccess: () => void
}

/** Modal para renovar credenciales gcloud vía WebSocket del cm-logs-ms. */
export const GcloudLoginModal = ({ open, onClose, onSuccess }: GcloudLoginModalProps) => {
  const [loginUrl, setLoginUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'waiting' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onCloseRef.current = onClose
    onSuccessRef.current = onSuccess
  }, [onClose, onSuccess])

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const ws = createLogsWebSocket()
    wsRef.current = ws
    setLoginUrl(null)
    setCode('')
    setStatus('waiting')
    setErrorMessage(null)

    ws.onopen = () => {
      authenticateLogsWebSocket(ws)
    }

    ws.onmessage = (event) => {
      const msg = parseLogStreamMessage(String(event.data))
      if (!msg) return

      if (msg.type === 'authenticated') {
        ws.send(JSON.stringify({ action: 'gcloud-login' }))
        return
      }

      if (msg.type === 'gcloud-login-url' && msg.url) {
        setLoginUrl(msg.url)
        setStatus('idle')
      }

      if (msg.type === 'gcloud-login-done') {
        if (msg.ok) {
          onSuccessRef.current()
          onCloseRef.current()
        } else {
          setStatus('error')
          setErrorMessage('No se pudo completar el inicio de sesión. Intenta de nuevo.')
        }
      }

      if (msg.type === 'error' && msg.text) {
        setStatus('error')
        setErrorMessage(msg.text)
      }
    }

    ws.onerror = () => {
      setStatus('error')
      setErrorMessage('Error de conexión con el servicio de logs.')
    }

    return () => {
      document.body.style.overflow = originalOverflow
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'stop' }))
      }
      ws.close()
      wsRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const handleSubmitCode = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setStatus('submitting')
    wsRef.current.send(JSON.stringify({ action: 'gcloud-login-code', code: trimmed }))
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gcloud-login-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section
        ref={dialogRef}
        style={{ boxShadow: 'var(--shadow-24)' }}
        className="surface flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-3)] border border-[var(--border-default)]"
      >
        <header className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-3.5">
          <h2 id="gcloud-login-title" className="text-sm font-bold text-[var(--text-body)]">
            Iniciar sesión en Google Cloud
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de login"
            className="grid size-8 place-items-center rounded-[var(--radius-1)] text-[var(--text-muted)] hover:bg-[var(--border-default)]/30 hover:text-[var(--text-body)]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="flex flex-col gap-4 p-5 text-sm text-[var(--text-muted)]">
          <p>
            Abre el enlace de Google, autoriza tu cuenta y pega el código de verificación en el campo inferior.
          </p>

          {status === 'waiting' && !loginUrl && (
            <div className="flex items-center gap-2 text-[var(--text-body)]" aria-live="polite">
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
              />
              Preparando enlace de autenticación…
            </div>
          )}

          {loginUrl && (
            <a
              href={loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-contrast)]"
            >
              Abrir login de Google
            </a>
          )}

          <form onSubmit={handleSubmitCode} className="flex flex-col gap-3">
            <label htmlFor="gcloud-verification-code" className="text-xs font-bold text-[var(--text-body)]">
              Código de verificación
            </label>
            <input
              id="gcloud-verification-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              disabled={status === 'submitting'}
              className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2.5 text-sm text-[var(--text-body)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
              placeholder="Pega el código aquí"
            />
            <button
              type="submit"
              disabled={!code.trim() || status === 'submitting' || !loginUrl}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'submitting' && (
                <span
                  aria-hidden="true"
                  className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
                />
              )}
              Confirmar
            </button>
          </form>

          {errorMessage && (
            <p
              className="rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] px-3 py-2 text-xs text-[var(--alert-error-fg)]"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
